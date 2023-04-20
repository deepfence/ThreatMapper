//go:build dummy
// +build dummy

package probe

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"

	scopeHostname "github.com/weaveworks/scope/common/hostname"

	_ "embed"

	"github.com/weaveworks/scope/report"
)

//go:embed dummy/agent-report.json
var dummy_agent string

var dummyNum int

func init() {
	dummy := os.Getenv("DF_USE_DUMMY_SCOPE")
	if dummy != "" {
		dummyNum, _ = strconv.Atoi(dummy)
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
	dummy_agent_sed = []byte(res)
	fmt.Printf("%v", res)
	rpt := report.MakeReport()
	err = json.Unmarshal(dummy_agent_sed, &rpt)
	for {
		select {
		case <-time.After(time.Second * time.Duration(p.publisher.PublishInterval())):
			if err != nil {
				log.Errorf("rpt unmarshal err: %v", err)
				continue
			}

			err = p.publisher.Publish(rpt)
			if err == nil {
				publishCount++
			} else {
				// If we failed to send then drop back to full report next time
				publishCount = 0
			}
		case <-p.quit:
			return
		}
		if err != nil {
			log.Infof("Publish: %v", err)
		}
	}
}
