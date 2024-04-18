package probe

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"

	"github.com/weaveworks/scope/report"
)

const (
	// There are 4 reports in production, default is spy every 5 seconds, max is 1800 sec (30 min)
	// This gives us the max number of reports over 30 min
	spiedReportBufferSize = 4 * 360
)

// ReportPublisher publishes reports, probably to a remote collector.
type ReportPublisher interface {
	Publish(r report.Report) error
	PublishInterval() int32
}

type AsyncMerger struct {
	spiedReports chan report.Report
	nextReport   report.Report
	access       sync.Mutex
	wg           sync.WaitGroup
	cancel       context.CancelFunc
	drainCount   int
}

func NewAsyncMerger(bufferSize int) *AsyncMerger {
	res := &AsyncMerger{
		spiedReports: make(chan report.Report, spiedReportBufferSize),
		nextReport:   report.MakeReport(),
	}

	res.start()

	return res
}

func (dc *AsyncMerger) start() {

	ctx, cancel := context.WithCancel(context.Background())
	dc.cancel = cancel

	dc.wg.Add(1)
	go func() {
		defer dc.wg.Done()
		for {
			select {
			case r := <-dc.spiedReports:
				dc.nextReport.UnsafeMerge(r)
				dc.drainCount++
			case <-ctx.Done():
				return
			}
		}
	}()
}

func (dc *AsyncMerger) Add(r *report.Report) error {
	dc.access.Lock()
	defer dc.access.Unlock()
	select {
	case dc.spiedReports <- r.Copy():
	default:
		return errors.New("reports full")
	}
	return nil
}

func (dc *AsyncMerger) stopAndFlush() {
	dc.access.Lock()
	defer dc.access.Unlock()

	dc.cancel()
	dc.wg.Wait()

	for len(dc.spiedReports) > 0 {
		dc.nextReport.UnsafeMerge(<-dc.spiedReports)
		dc.drainCount++
	}

}

func (dc *AsyncMerger) Drain() (report.Report, int) {
	dc.stopAndFlush()

	res := dc.nextReport
	cnt := dc.drainCount

	dc.nextReport = report.MakeReport()
	dc.drainCount = 0

	dc.start()

	return res, cnt
}

// Probe sits there, generating and publishing reports.
type Probe struct {
	spyInterval, publishInterval time.Duration
	publisher                    ReportPublisher
	ticksPerFullReport           int
	noControls                   bool

	tickers          []Ticker
	reporters        []Reporter
	taggers          []Tagger
	reportersReports []report.Report
	readyIndxes      chan int

	ctx    context.Context
	cancel context.CancelFunc

	spiedReports *AsyncMerger
}

// Tagger tags nodes with value-add node metadata.
type Tagger interface {
	Name() string
	Tag(r report.Report) (report.Report, error)
}

// Reporter generates Reports.
type Reporter interface {
	Name() string
	Report() (report.Report, error)
}

// ReporterFunc uses a function to implement a Reporter
func ReporterFunc(name string, f func() (report.Report, error)) Reporter {
	return reporterFunc{name, f}
}

type reporterFunc struct {
	name string
	f    func() (report.Report, error)
}

func (r reporterFunc) Name() string                   { return r.name }
func (r reporterFunc) Report() (report.Report, error) { return r.f() }

// Ticker is something which will be invoked every spyDuration.
// It's useful for things that should be updated on that interval.
// For example, cached shared state between Taggers and Reporters.
type Ticker interface {
	Name() string
	Tick() error
}

// New makes a new Probe.
func New(
	spyInterval, publishInterval time.Duration,
	publisher ReportPublisher,
	ticksPerFullReport int,
	noControls bool,
) *Probe {
	ctx, cancel := context.WithCancel(context.Background())
	result := &Probe{
		spyInterval:        spyInterval,
		publishInterval:    publishInterval,
		publisher:          publisher,
		ticksPerFullReport: ticksPerFullReport,
		noControls:         noControls,
		spiedReports:       NewAsyncMerger(spiedReportBufferSize),
		ctx:                ctx,
		cancel:             cancel,
	}
	return result
}

// AddTagger adds a new Tagger to the Probe
func (p *Probe) AddTagger(ts ...Tagger) {
	p.taggers = append(p.taggers, ts...)
}

// AddReporter adds a new Reported to the Probe
func (p *Probe) AddReporter(rs ...Reporter) {
	p.reporters = append(p.reporters, rs...)

	p.reportersReports = append(p.reportersReports, report.Report{})
	p.readyIndxes = make(chan int, len(p.reporters))
}

// AddTicker adds a new Ticker to the Probe
func (p *Probe) AddTicker(ts ...Ticker) {
	p.tickers = append(p.tickers, ts...)
}

// Stop stops the probe
func (p *Probe) Stop() error {
	p.cancel()
	return nil
}

// Publish will queue a report for immediate publication,
// bypassing the spy tick
func (p *Probe) Publish(rpt report.Report) {
	rpt = p.tag(rpt)
	err := p.spiedReports.Add(&rpt)
	if err != nil {
		log.Error().Err(err).Msg("Spy enqueue failed")
	}
}

func (p *Probe) spyLoop(ctx context.Context) {
	rpt := report.MakeReport()
	for {
		select {
		case <-time.After(p.spyInterval):
			for _, ticker := range p.tickers {
				err := ticker.Tick()
				if err != nil {
					log.Error().Err(err).Msgf("Spy ticks for %v failed", ticker.Name())
				}
			}
			rpt.Clear()
			rpt := p.mergeReporters(rpt)
			rpt = p.tag(rpt)
			err := p.spiedReports.Add(&rpt)
			if err != nil {
				log.Error().Err(err).Msg("Spy enqueue failed")
			}
		case <-ctx.Done():
			return
		}
	}
}

func (p *Probe) mergeReporters(result report.Report) report.Report {
	for i, rep := range p.reporters {
		go func(rep Reporter) {
			t := time.Now()
			timer := time.AfterFunc(p.spyInterval, func() { log.Warn().Msgf("%v reporter took longer than %v", rep.Name(), p.spyInterval) })
			newReport, err := rep.Report()
			if !timer.Stop() {
				log.Warn().Msgf("%v reporter took %v (longer than %v)", rep.Name(), time.Now().Sub(t), p.spyInterval)
			}
			if err != nil {
				log.Error().Msgf("Error generating %s report: %v", rep.Name(), err)
				newReport = report.MakeReport() // empty is OK to merge
			}
			p.reportersReports[i] = newReport
			p.readyIndxes <- i
		}(rep)
	}

	result.TS = time.Now()
	for i := 0; i < cap(p.readyIndxes); i++ {
		index := <-p.readyIndxes
		result.UnsafeMerge(p.reportersReports[index])
		p.reportersReports[index].Clear()
	}
	return result
}

func (p *Probe) tag(r report.Report) report.Report {
	var err error
	for _, tagger := range p.taggers {
		t := time.Now()
		timer := time.AfterFunc(p.spyInterval, func() { log.Warn().Msgf("%v tagger took longer than %v", tagger.Name(), p.spyInterval) })
		r, err = tagger.Tag(r)
		if !timer.Stop() {
			log.Warn().Msgf("%v tagger took %v (longer than %v)", tagger.Name(), time.Now().Sub(t), p.spyInterval)
		}
		if err != nil {
			log.Error().Msgf("Error applying tagger: %v", err)
		}
	}
	return r
}
