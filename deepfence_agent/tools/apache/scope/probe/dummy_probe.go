//go:build dummy
// +build dummy

package probe

import (
	"encoding/json"
	"math/rand"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"

	scopeHostname "github.com/weaveworks/scope/common/hostname"
	"github.com/weaveworks/scope/probe/appclient"

	_ "embed"

	"github.com/weaveworks/scope/report"
)

var dummy_agent string

//go:embed dummy/agent-report.json
var slim_dummy_agent string

//go:embed dummy/fat-agent-report.json
var fat_dummy_agent string

var dummyNum int

func init() {
	dummy := os.Getenv("DF_USE_DUMMY_SCOPE")
	if dummy != "" {
		dummyNum, _ = strconv.Atoi(dummy)
	}

	dummy_agent = slim_dummy_agent
	useFat := os.Getenv("DF_USE_FAT_DUMMY_SCOPE")
	if useFat != "" {
		dummy_agent = fat_dummy_agent
	}
}

// Start starts the probe
func (p *Probe) Start() {
	for i := 0; i < dummyNum; i++ {
		p.done.Add(1)
		go p.dummyPublishLoop(i)
	}
}

func (p *Probe) dummyPublishLoop(i int) {
	var err error
	defer p.done.Done()
	publishCount := 0
	var dummy_agent_sed []byte
	hostname := scopeHostname.Get()
	res := strings.ReplaceAll(dummy_agent, "agent-sed-string", hostname+strconv.Itoa(i))
	res = strings.ReplaceAll(res, "region-sed-string", hostname)
	dummy_agent_sed = []byte(res)
	rpt := report.MakeReport()
	err = json.Unmarshal(dummy_agent_sed, &rpt)

	if err != nil {
		log.Error().Msgf("rpt unmarshal err: %v", err)
		return
	}

	// Add jitter
	<-time.After(time.Second * time.Duration(i/70))

	for {
		select {
		case <-time.After(time.Second * time.Duration(p.publisher.PublishInterval())):
			err = p.publisher.Publish(rpt)
			if err == nil {
				publishCount++
			} else if err == appclient.PushBackError {
				rand.Seed(time.Now().UnixNano())
				randomDelay := rand.Intn(int(p.publisher.PublishInterval()))
				time.Sleep(time.Duration(randomDelay) * time.Second)
			} else {
				// If we failed to send then drop back to full report next time
				publishCount = 0
			}
		case <-p.quit:
			return
		}
		if err != nil {
			log.Info().Msgf("Publish: %v", err)
		}
	}
}
