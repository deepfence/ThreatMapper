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
	spiedReportBufferSize = 1024
)

// ReportPublisher publishes reports, probably to a remote collector.
type ReportPublisher interface {
	Publish(r report.Report) error
	PublishInterval() int32
}

type DrainableChan struct {
	spiedReports   chan report.Report
	drainedReports chan report.Report
	access         sync.Mutex
}

func NewDrainableChan(bufferSize int) DrainableChan {
	return DrainableChan{
		spiedReports:   make(chan report.Report, bufferSize),
		drainedReports: make(chan report.Report, bufferSize),
	}
}

func (dc *DrainableChan) Add(r *report.Report) error {
	dc.access.Lock()
	defer dc.access.Unlock()
	select {
	case dc.spiedReports <- r.Copy():
	default:
		return errors.New("reports full")
	}
	return nil
}

func (dc *DrainableChan) Drain() <-chan report.Report {
	dc.access.Lock()
	defer dc.access.Unlock()
	tmp := dc.drainedReports
	dc.drainedReports = dc.spiedReports
	dc.spiedReports = tmp
	return dc.drainedReports
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

	spiedReports DrainableChan
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
		spiedReports:       NewDrainableChan(spiedReportBufferSize),
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
			rpt := p.report(rpt)
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

func (p *Probe) report(result report.Report) report.Report {
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

func (p *Probe) drainAndSanitise(rpt report.Report, rs <-chan report.Report) (report.Report, int) {
	//rpt = rpt.Copy()
	count := 0
	for len(rs) != 0 {
		rpt.UnsafeMerge(<-rs)
		count++
	}
	if p.noControls {
		//rpt.WalkTopologies(func(t *report.Topology) {
		//	t.Controls = report.Controls{}
		//})
	}
	return rpt, count
}
