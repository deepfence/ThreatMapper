package processors

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
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
		bulkActions:   100,
		flushInterval: 10 * time.Second,
		requestsC:     make(chan BulkRequest, 100),
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
		go p.workers[i].work(ctx)
	}

	// Start the ticker for flush
	if int64(p.flushInterval) > 0 {
		p.flusherStopC = make(chan struct{})
		go p.flusher(p.flushInterval)
	}

	return nil
}

func (p *BulkProcessor) flusher(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C: // Periodic flush
			p.Flush()

		case <-p.flusherStopC:
			p.flusherStopC <- struct{}{}
			return
		}
	}
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

type bulkWorker struct {
	p           *BulkProcessor
	i           int
	bulkActions int
	buffer      map[string][][]byte
	flushC      chan struct{}
	flushAckC   chan struct{}
	worker_id   string
}

func newBulkWorker(p *BulkProcessor, i int) *bulkWorker {
	return &bulkWorker{
		p:           p,
		i:           i,
		bulkActions: p.bulkActions,
		buffer:      make(map[string][][]byte),
		flushC:      make(chan struct{}),
		flushAckC:   make(chan struct{}),
		worker_id:   fmt.Sprintf("%s.%d", p.name, i),
	}
}

func (w *bulkWorker) work(ctx context.Context) {
	defer func() {
		w.p.workerWg.Done()
		close(w.flushAckC)
		close(w.flushC)
	}()

	log.Info().Str("worker", w.worker_id).Msg("started")

	var stop bool
	for !stop {
		select {
		case req, open := <-w.p.requestsC:
			if open {
				// Received a new request
				w.buffer[req.NameSpace] = append(w.buffer[req.NameSpace], req.Data)
				if w.commitRequired() {
					log.Info().Str("worker", w.worker_id).Msg("buffer full commit all")
					if errs := w.commit(ctx); len(errs) != 0 {
						log.Error().Str("worker", w.worker_id).Msgf("%v", errs)
					}
				}

			} else {
				// Channel closed: Stop.
				stop = true
				if len(w.buffer) > 0 {
					log.Info().Str("worker", w.worker_id).Msg("exit called commit all")
					if errs := w.commit(ctx); len(errs) != 0 {
						log.Error().Str("worker", w.worker_id).Msgf("%v", errs)
					}
				}
			}

		case <-w.flushC:
			// Commit outstanding requests
			if len(w.buffer) > 0 {
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
	if w.bulkActions >= 0 && len(w.buffer) >= w.bulkActions {
		return true
	}
	return false
}

func (w *bulkWorker) commit(ctx context.Context) []error {
	errs := []error{}
	for k, v := range w.buffer {
		log.Info().Str("worker", w.worker_id).Msgf("namespace=%s #data=%d", k, len(v))
		if err := w.p.commitFn(k, v); err != nil {
			errs = append(errs, err)
		}
	}
	// reset buffer after commit
	w.buffer = make(map[string][][]byte)
	return errs
}
