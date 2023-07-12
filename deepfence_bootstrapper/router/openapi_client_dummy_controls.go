//go:build dummy
// +build dummy

package router

import (
	"context"
	"math/rand"
	"os"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	"github.com/weaveworks/scope/probe/controls"
	"github.com/weaveworks/scope/probe/host"
)

var dummyNum int

func init() {
	dummy := os.Getenv("DF_USE_DUMMY_SCOPE")
	if dummy != "" {
		dummyNum, _ = strconv.Atoi(dummy)
	}
}

func (ct *OpenapiClient) StartControlsWatching(nodeId string, isClusterAgent bool) error {

	for i := 0; i < dummyNum; i++ {

		// Add jitter
		<-time.After(time.Second * time.Duration(i/70))

		dummyNodeId := nodeId + strconv.Itoa(i)

		if isClusterAgent {

		} else {

			req := ct.API().ControlsAPI.GetAgentInitControls(context.Background())
			req = req.ModelInitAgentReq(
				*openapi.NewModelInitAgentReq(
					getMaxAllocatable(),
					dummyNodeId,
					host.AgentVersionNo,
				),
			)
			ctl, _, err := ct.API().ControlsAPI.GetAgentInitControlsExecute(req)

			if err != nil {
				ct.publishInterval.Store(30)
			} else {
				ct.publishInterval.Store(ctl.Beatrate)
			}

			for _, action := range ctl.Commands {
				log.Info().Msgf("Init execute :%v", action.Id)
				err := controls.ApplyControl(action)
				if err != nil {
					log.Error().Msgf("Control %v failed: %v\n", action, err)
				}
			}
		}

		if isClusterAgent {
			go func() {
				req := ct.API().ControlsAPI.GetKubernetesClusterControls(context.Background())
				agentId := openapi.NewModelAgentId(getMaxAllocatable(), dummyNodeId)
				req = req.ModelAgentId(*agentId)
				for {
					select {
					case <-time.After(time.Second * time.Duration(ct.PublishInterval()/2)):
					case <-ct.stopControlListening:
						break
					}
					agentId.SetAvailableWorkload(getMaxAllocatable())
					req = req.ModelAgentId(*agentId)
					ctl, _, err := ct.API().ControlsAPI.GetKubernetesClusterControlsExecute(req)
					if err != nil {
						log.Error().Msgf("Getting controls failed: %v\n", err)
						continue
					}

					ct.publishInterval.Store(ctl.Beatrate)

					for _, action := range ctl.Commands {
						log.Info().Msgf("Execute :%v", action.Id)
						err := controls.ApplyControl(action)
						if err != nil {
							log.Error().Msgf("Control %v failed: %v\n", action, err)
						}
					}
				}
			}()
		} else {
			go func() {
				req := ct.API().ControlsAPI.GetAgentControls(context.Background())
				agentId := openapi.NewModelAgentId(getMaxAllocatable(), dummyNodeId)
				req = req.ModelAgentId(*agentId)
				for {
					select {
					case <-time.After(time.Second * time.Duration(ct.PublishInterval())):
					case <-ct.stopControlListening:
						break
					}
					agentId.SetAvailableWorkload(getMaxAllocatable())
					req = req.ModelAgentId(*agentId)
					ctl, _, err := ct.API().ControlsAPI.GetAgentControlsExecute(req)
					if err != nil {
						log.Error().Msgf("Getting controls failed: %v\n", err)
						rand.Seed(time.Now().UnixNano())
						randomDelay := rand.Intn(int(ct.PublishInterval()))
						time.Sleep(time.Duration(randomDelay) * time.Second)
						continue
					}
					ct.publishInterval.Store(ctl.Beatrate)

					for _, action := range ctl.Commands {
						log.Info().Msgf("Execute :%v", action.Id)
						err := controls.ApplyControl(action)
						if err != nil {
							log.Error().Msgf("Control %v failed: %v\n", action, err)
						}
					}
				}
			}()
		}
	}

	return nil
}

const (
	MAX_AGENT_WORKLOAD = 2
)

func GetScannersWorkloads() int32 {
	res := int32(0)
	//TODO: Add more scanners workfload
	return res
}

var upgrade atomic.Bool

func SetUpgrade() {
	upgrade.Store(true)
}

func getUpgradeWorkload() int32 {
	if upgrade.Load() {
		return MAX_AGENT_WORKLOAD
	}
	return 0
}

func getMaxAllocatable() int32 {
	return 1
}
