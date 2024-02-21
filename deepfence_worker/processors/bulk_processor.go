package processors

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/cenkalti/backoff/v3"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/db"
)

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
	ns            string
	bulkActions   int
	numWorkers    int
	requestsC     chan BulkRequest
	workerWg      sync.WaitGroup
	workers       []*bulkWorker
	flushInterval time.Duration
	flusherStopC  chan struct{}
	commitFn      commitFn
	breaker       sync.RWMutex
}

type commitFn func(ctx context.Context, ns string, data [][]byte) error

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

func NewBulkProcessor(name string, ns string, fn commitFn) *BulkProcessor {
	return &BulkProcessor{
		name:          name,
		ns:            ns,
		commitFn:      fn,
		numWorkers:    1,
		bulkActions:   1_000,
		flushInterval: 10 * time.Second,
		requestsC:     make(chan BulkRequest, 2*1_000),
	}
}

func NewBulkProcessorWithSize(name string, ns string, fn commitFn, size int) *BulkProcessor {
	return &BulkProcessor{
		name:          name,
		ns:            ns,
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
	workerID    string
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
		workerID:    fmt.Sprintf("%s.%s.%d", p.name, p.ns, i),
		expBackoff:  backoff.WithMaxRetries(expBackoff, 3),
	}
}

func (w *bulkWorker) work(ctx context.Context, flushInterval time.Duration) {
	defer func() {
		w.p.workerWg.Done()
		close(w.flushAckC)
		close(w.flushC)
	}()

	log.Info().Str("worker", w.workerID).Msg("started")

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
					log.Debug().Str("worker", w.workerID).Msg("buffer full commit all")
					if errs := w.commit(ctx); len(errs) != 0 {
						log.Error().Str("worker", w.workerID).Msgf("%v", errs)
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
					log.Info().Str("worker", w.workerID).Msg("exit called commit all")
					if errs := w.commit(ctx); len(errs) != 0 {
						log.Error().Str("worker", w.workerID).Msgf("%v", errs)
					}
				}
			}

		case <-ticker.C:
			// Commit outstanding requests
			if w.buffer.Size() > 0 {
				log.Debug().Str("worker", w.workerID).Msg("ticker called commit all")
				if errs := w.commit(ctx); len(errs) != 0 {
					log.Error().Str("worker", w.workerID).Msgf("%v", errs)
				}
			}
		case <-w.flushC:
			// Commit outstanding requests
			if w.buffer.Size() > 0 {
				log.Info().Str("worker", w.workerID).Msg("flush called commit all")
				if errs := w.commit(ctx); len(errs) != 0 {
					log.Error().Str("worker", w.workerID).Msgf("%v", errs)
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

	ctx = directory.NewContextWithNameSpace(directory.NamespaceID(w.p.ns))

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "bulk-processor", "commit")
	defer span.End()

	for k, v := range w.buffer.Read() {

		log.Info().Str("worker", w.workerID).Msgf("#data=%d", len(v))

		w.expBackoff.Reset()

		var err error
		for {
			w.p.breaker.RLock()
			err = w.p.commitFn(ctx, k, v)
			w.p.breaker.RUnlock()
			if err != nil {
				if isTransientError(err) {
					waitTime := w.expBackoff.NextBackOff()
					if waitTime != backoff.Stop {
						<-time.After(waitTime)
						continue
					}
				} else if isConnectivityError(err) {
					go func() {
						w.p.breaker.Lock()
						defer w.p.breaker.Unlock()

						log.Info().Msgf("Breaker opened")

						configs, err := directory.GetDatabaseConfig(ctx)
						if err != nil {
							log.Error().Msg(err.Error())
							return
						}
						hostPort := strings.Split(configs.Neo4j.Endpoint, ":")
						if len(hostPort) != 3 {
							log.Error().Msgf("Invalid endpoint %v", configs.Neo4j.Endpoint)
							return
						}
						for {
							err = utils.WaitServiceTCPConn(hostPort[1][2:], hostPort[2], time.Second*30)
							if err != nil {
								log.Error().Msgf("err: %v", err)
								continue
							}
							break
						}
						log.Info().Msgf("Breaker closed")
					}()
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
		CommitNeo4jRecordsCounts.WithLabelValues(w.workerID, "error", w.p.ns).Add(float64(w.buffer.size))
	} else {
		CommitNeo4jRecordsCounts.WithLabelValues(w.workerID, "success", w.p.ns).Add(float64(w.buffer.size))
	}
	// reset buffer after commit
	w.buffer.Reset()
	return errs
}
