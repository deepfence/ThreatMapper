//go:build !dummy
// +build !dummy

package probe

import (
	"context"
	"math/rand"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"

	"github.com/weaveworks/scope/probe/appclient"
	"github.com/weaveworks/scope/report"
)

// Start starts the probe
func (p *Probe) Start() {
	go p.spyLoop(p.ctx)
	go p.publishLoop(p.ctx)
}

func (p *Probe) publishLoop(ctx context.Context) {
	startTime := time.Now()
	publishCount := 0
	var lastFullReport report.Report
	for {
		log.Info().Msgf("Report publish interval: %d", p.publisher.PublishInterval())
		select {
		case <-time.After(time.Second * time.Duration(p.publisher.PublishInterval())):
			rpt, count := p.spiedReports.Drain()
			if count == 0 {
				continue // No data has been collected - don't bother publishing.
			}

			fullReport := (publishCount % p.ticksPerFullReport) == 0
			if !fullReport {
				rpt.UnsafeUnMerge(lastFullReport)
			} else {
				if fullReport {
					lastFullReport = rpt
				}
			}
			rpt.Window = time.Now().Sub(startTime)
			startTime = time.Now()
			err := p.publisher.Publish(rpt)
			if err != nil {
				log.Error().Msgf("Publish err: %v", err)

				// If we failed to send then drop back to full report next time
				publishCount = 0

				if err == appclient.PushBackError {
					randomDelay := rand.Intn(int(p.publisher.PublishInterval()))
					time.Sleep(time.Duration(randomDelay) * time.Second)
				}
				continue
			}
			publishCount++

		case <-p.ctx.Done():
			return
		}
	}
}
