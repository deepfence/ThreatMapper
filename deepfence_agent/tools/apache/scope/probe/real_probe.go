//go:build !dummy
// +build !dummy

package probe

import (
	"math/rand"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"

	"github.com/weaveworks/scope/probe/appclient"
	"github.com/weaveworks/scope/report"
)

// Start starts the probe
func (p *Probe) Start() {
	p.done.Add(2)
	go p.spyLoop()
	go p.publishLoop()
}

func (p *Probe) publishLoop() {
	defer p.done.Done()
	startTime := time.Now()
	publishCount := 0
	var lastFullReport report.Report
	ticker := time.NewTicker(time.Second * time.Duration(p.publisher.PublishInterval()))
	for {
		log.Info().Msgf("Report publish interval: %d", p.publisher.PublishInterval())
		ticker.Reset(time.Second * time.Duration(p.publisher.PublishInterval()))
		var err error
		select {
		case <-ticker.C:
			rpt, count := p.drainAndSanitise(report.MakeReport(), p.spiedReports)
			if count == 0 {
				continue // No data has been collected - don't bother publishing.
			}

			fullReport := (publishCount % p.ticksPerFullReport) == 0
			if !fullReport {
				rpt.UnsafeUnMerge(lastFullReport)
			}
			rpt.Window = time.Now().Sub(startTime)
			startTime = time.Now()
			err = p.publisher.Publish(rpt)
			if err == nil {
				if fullReport {
					lastFullReport = rpt
				}
				publishCount++
			} else if err == appclient.PushBackError {
				rand.Seed(time.Now().UnixNano())
				randomDelay := rand.Intn(int(p.publisher.PublishInterval()))
				time.Sleep(time.Duration(randomDelay) * time.Second)
				continue
			} else {
				// If we failed to send then drop back to full report next time
				publishCount = 0
			}

		//case rpt := <-p.shortcutReports:
		//	rpt, _ = p.drainAndSanitise(rpt, p.shortcutReports)
		//	err = p.publisher.Publish(rpt)

		case <-p.quit:
			return
		}
		if err != nil {
			log.Info().Msgf("Publish: %v", err)
		}
	}
}
