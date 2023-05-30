package processors

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/deepfence/golang_deepfence_sdk/utils/log"
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
		bulkActions:   1_000,
		flushInterval: 10 * time.Second,
		requestsC:     make(chan BulkRequest, 2*1_000),
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
}

func newBulkWorker(p *BulkProcessor, i int) *bulkWorker {
	return &bulkWorker{
		p:           p,
		i:           i,
		bulkActions: p.bulkActions,
		buffer:      NewBulkBuffer(),
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
				w.buffer.Add(req)
				if w.commitRequired() {
					log.Info().Str("worker", w.worker_id).Msg("buffer full commit all")
					if errs := w.commit(ctx); len(errs) != 0 {
						log.Error().Str("worker", w.worker_id).Msgf("%v", errs)
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

func (w *bulkWorker) commit(ctx context.Context) []error {
	errs := []error{}
	for k, v := range w.buffer.Read() {
		log.Info().Str("worker", w.worker_id).Msgf("namespace=%s #data=%d", k, len(v))
		if err := w.p.commitFn(k, v); err != nil {
			errs = append(errs, err)
		}
	}
	// reset buffer after commit
	w.buffer.Reset()
	return errs
}
