//go:build dummy
// +build dummy

package appclient

import (
	"context"
	"os"
	"strconv"
	"sync/atomic"
	"time"

	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	"github.com/sirupsen/logrus"
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

		dummyNodeId := nodeId + strconv.Itoa(i)

		if isClusterAgent {

		} else {

			req := ct.client.ControlsApi.GetAgentInitControls(context.Background())
			req = req.ModelInitAgentReq(
				*openapi.NewModelInitAgentReq(
					getMaxAllocatable(),
					dummyNodeId,
					host.AgentVersionNo,
				),
			)
			ctl, _, err := ct.client.ControlsApi.GetAgentInitControlsExecute(req)

			ct.publishInterval.Store(ctl.Beatrate)

			if err != nil {
				return err
			}

			for _, action := range ctl.Commands {
				logrus.Infof("Init execute :%v", action.Id)
				err := controls.ApplyControl(action)
				if err != nil {
					logrus.Errorf("Control %v failed: %v\n", action, err)
				}
			}
		}

		if isClusterAgent {
			go func() {
				req := ct.client.ControlsApi.GetKubernetesClusterControls(context.Background())
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
					ctl, _, err := ct.client.ControlsApi.GetKubernetesClusterControlsExecute(req)
					if err != nil {
						logrus.Errorf("Getting controls failed: %v\n", err)
						continue
					}

					ct.publishInterval.Store(ctl.Beatrate)

					for _, action := range ctl.Commands {
						logrus.Infof("Execute :%v", action.Id)
						err := controls.ApplyControl(action)
						if err != nil {
							logrus.Errorf("Control %v failed: %v\n", action, err)
						}
					}
				}
			}()
		} else {
			go func() {
				req := ct.client.ControlsApi.GetAgentControls(context.Background())
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
					ctl, _, err := ct.client.ControlsApi.GetAgentControlsExecute(req)
					if err != nil {
						logrus.Errorf("Getting controls failed: %v\n", err)
						continue
					}

					ct.publishInterval.Store(ctl.Beatrate)

					for _, action := range ctl.Commands {
						logrus.Infof("Execute :%v", action.Id)
						err := controls.ApplyControl(action)
						if err != nil {
							logrus.Errorf("Control %v failed: %v\n", action, err)
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
