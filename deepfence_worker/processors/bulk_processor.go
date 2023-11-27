package processors

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/cenkalti/backoff/v3"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/db"
)

var (
	wait    chan struct{}
	breaker sync.RWMutex
)

func init() {
	wait = make(chan struct{})

	neo4j_port := os.Getenv("DEEPFENCE_NEO4J_BOLT_PORT")
	neo4j_host := os.Getenv("DEEPFENCE_NEO4J_HOST")
	go func() {
		for {
			<-wait
			breaker.Lock()
			log.Info().Msgf("Breaker opened")
			for {
				err := utils.WaitServiceTCPConn(neo4j_host, neo4j_port, time.Second*30)
				if err != nil {
					log.Error().Msgf("err: %v", err)
					continue
				}
				break
			}
			breaker.Unlock()
			log.Info().Msgf("Breaker closed")
		}
	}()
}

type BulkRequest struct {
	NameSpace string
	Data      []byte
}

func NewBulkRequest(namespace string, data []byte) BulkRequest {
	return BulkRequest{
		NameSpace: namespace,
		Data:      data,
	}
}

type BulkProcessor struct {
	name          string
	bulkActions   int
	numWorkers    int
	requestsC     chan BulkRequest
	workerWg      sync.WaitGroup
	workers       []*bulkWorker
	flushInterval time.Duration
	flusherStopC  chan struct{}
	commitFn      commitFn
}

type commitFn func(ns string, data [][]byte) error

func (s *BulkProcessor) Add(b BulkRequest) {
	s.requestsC <- b
}

func (s *BulkProcessor) Workers(num int) *BulkProcessor {
	s.numWorkers = num
	return s
}

func (s *BulkProcessor) BulkActions(bulkActions int) *BulkProcessor {
	s.bulkActions = bulkActions
	return s
}

func (s *BulkProcessor) FlushInterval(interval time.Duration) *BulkProcessor {
	s.flushInterval = interval
	return s
}

func NewBulkProcessor(name string, fn commitFn) *BulkProcessor {
	return &BulkProcessor{
		name:          name,
		commitFn:      fn,
		numWorkers:    1,
		bulkActions:   1_000,
		flushInterval: 10 * time.Second,
		requestsC:     make(chan BulkRequest, 2*1_000),
	}
}

func NewBulkProcessorWith(name string, fn commitFn, size int) *BulkProcessor {
	return &BulkProcessor{
		name:          name,
		commitFn:      fn,
		numWorkers:    1,
		bulkActions:   size,
		flushInterval: 10 * time.Second,
		requestsC:     make(chan BulkRequest, 2*size),
	}
}

func (p *BulkProcessor) Start(ctx context.Context) error {

	log.Info().Msgf("start bulk processor %s", p.name)
	// Must have at least one worker.
	if p.numWorkers < 1 {
		p.numWorkers = 1
	}

	// Create and start workers.
	p.workers = make([]*bulkWorker, p.numWorkers)
	for i := 0; i < p.numWorkers; i++ {
		p.workerWg.Add(1)
		p.workers[i] = newBulkWorker(p, i)
		go p.workers[i].work(ctx, p.flushInterval)
	}

	return nil
}

func (p *BulkProcessor) Flush() {
	for _, w := range p.workers {
		w.flushC <- struct{}{}
		<-w.flushAckC // wait for completion
	}
}

func (p *BulkProcessor) Stop() error {
	return p.Close()
}

func (p *BulkProcessor) Close() error {
	// Stop flusher
	if p.flusherStopC != nil {
		p.flusherStopC <- struct{}{}
		<-p.flusherStopC
		close(p.flusherStopC)
		p.flusherStopC = nil
	}

	// Stop all workers.
	close(p.requestsC)
	p.workerWg.Wait()

	return nil
}

type bulKBuffer struct {
	buffer map[string][][]byte
	size   int
}

func NewBulkBuffer() *bulKBuffer {
	return &bulKBuffer{
		buffer: make(map[string][][]byte),
		size:   0,
	}
}

func (b *bulKBuffer) Add(req BulkRequest) {
	b.buffer[req.NameSpace] = append(b.buffer[req.NameSpace], req.Data)
	b.size++
}

func (b *bulKBuffer) Reset() {
	b.buffer = make(map[string][][]byte)
	b.size = 0
}

func (b *bulKBuffer) Read() map[string][][]byte {
	return b.buffer
}

func (b *bulKBuffer) Size() int {
	return b.size
}

type bulkWorker struct {
	p           *BulkProcessor
	i           int
	bulkActions int
	buffer      *bulKBuffer
	flushC      chan struct{}
	flushAckC   chan struct{}
	worker_id   string
	expBackoff  backoff.BackOff
}

func newBulkWorker(p *BulkProcessor, i int) *bulkWorker {

	expBackoff := backoff.NewExponentialBackOff()
	expBackoff.InitialInterval = time.Second * 1
	expBackoff.MaxInterval = time.Second * 5
	expBackoff.Multiplier = 2
	expBackoff.RandomizationFactor = 0.1

	return &bulkWorker{
		p:           p,
		i:           i,
		bulkActions: p.bulkActions,
		buffer:      NewBulkBuffer(),
		flushC:      make(chan struct{}),
		flushAckC:   make(chan struct{}),
		worker_id:   fmt.Sprintf("%s.%d", p.name, i),
		expBackoff:  backoff.WithMaxRetries(expBackoff, 3),
	}
}

func (w *bulkWorker) work(ctx context.Context, flushInterval time.Duration) {
	defer func() {
		w.p.workerWg.Done()
		close(w.flushAckC)
		close(w.flushC)
	}()

	log.Info().Str("worker", w.worker_id).Msg("started")

	// Start the ticker for flush
	ticker := time.NewTicker(flushInterval)
	defer ticker.Stop()
	var stop bool
	for !stop {
		select {
		case req, open := <-w.p.requestsC:
			if open {
				// Received a new request
				w.buffer.Add(req)
				if w.commitRequired() {
					log.Info().Str("worker", w.worker_id).Msg("buffer full commit all")
					if errs := w.commit(ctx); len(errs) != 0 {
						log.Error().Str("worker", w.worker_id).Msgf("%v", errs)
					}
					ticker.Reset(flushInterval)
					for len(ticker.C) > 0 {
						<-ticker.C
					}
				}

			} else {
				// Channel closed: Stop.
				stop = true
				if w.buffer.Size() > 0 {
					log.Info().Str("worker", w.worker_id).Msg("exit called commit all")
					if errs := w.commit(ctx); len(errs) != 0 {
						log.Error().Str("worker", w.worker_id).Msgf("%v", errs)
					}
				}
			}

		case <-ticker.C:
			// Commit outstanding requests
			if w.buffer.Size() > 0 {
				log.Info().Str("worker", w.worker_id).Msg("ticker called commit all")
				if errs := w.commit(ctx); len(errs) != 0 {
					log.Error().Str("worker", w.worker_id).Msgf("%v", errs)
				}
			}
		case <-w.flushC:
			// Commit outstanding requests
			if w.buffer.Size() > 0 {
				log.Info().Str("worker", w.worker_id).Msg("flush called commit all")
				if errs := w.commit(ctx); len(errs) != 0 {
					log.Error().Str("worker", w.worker_id).Msgf("%v", errs)
				}
			}
			w.flushAckC <- struct{}{}
		}
	}
}

func (w *bulkWorker) commitRequired() bool {
	return w.buffer.Size() >= w.bulkActions
}

func isTransientError(err error) bool {
	// Check if the error is a deadlock error
	if neoErr, ok := err.(*db.Neo4jError); ok {
		return strings.HasPrefix(neoErr.Code, "Neo.TransientError")
	}
	return false
}

func isConnectivityError(err error) bool {
	if _, ok := err.(*neo4j.ConnectivityError); ok {
		return true
	}
	return false
}

func (w *bulkWorker) commit(ctx context.Context) []error {
	errs := []error{}
	for k, v := range w.buffer.Read() {
		log.Info().Str("worker", w.worker_id).Msgf("namespace=%s #data=%d", k, len(v))
		w.expBackoff.Reset()
		var err error
		for {
			breaker.RLock()
			err = w.p.commitFn(k, v)
			breaker.RUnlock()
			if err != nil {
				if isTransientError(err) {
					waitTime := w.expBackoff.NextBackOff()
					if waitTime != backoff.Stop {
						<-time.After(waitTime)
						continue
					}
				} else if isConnectivityError(err) {
					select {
					case wait <- struct{}{}:
					default:
					}
					// Give some room
					<-time.After(time.Second)
					continue
				}
				errs = append(errs, err)
			}
			break
		}
	}
	// metrics
	if len(errs) > 0 {
		commitNeo4jRecordsCounts.WithLabelValues(w.worker_id, "error").Add(float64(w.buffer.size))
	} else {
		commitNeo4jRecordsCounts.WithLabelValues(w.worker_id, "success").Add(float64(w.buffer.size))
	}
	// reset buffer after commit
	w.buffer.Reset()
	return errs
}
