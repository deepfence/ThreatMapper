//go:build dummy
// +build dummy

package probe

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"strconv"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"

	scopeHostname "github.com/weaveworks/scope/common/hostname"

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
	fmt.Printf("%v", res)
	rpt := report.MakeReport()
	err = json.Unmarshal(dummy_agent_sed, &rpt)

	if err != nil {
		log.Errorf("rpt unmarshal err: %v", err)
		return
	}

	// Add jitter
	rand.Seed(time.Now().UnixNano())

	min := 0
	max := 120

	randomSeconds := rand.Intn(max-min+1) + min

	sleepDuration := time.Duration(randomSeconds) * time.Second
	fmt.Printf("Sleeping for %d seconds...\n", randomSeconds)

	time.Sleep(sleepDuration)
	for {
		select {
		case <-time.After(time.Second * time.Duration(p.publisher.PublishInterval())):
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
