//go:build !dummy
// +build !dummy

package appclient

import (
	"context"
	"sync/atomic"
	"time"

	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	"github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/probe/controls"
	"github.com/weaveworks/scope/probe/host"
)

func (ct *OpenapiClient) StartControlsWatching(nodeId string, isClusterAgent bool) error {
	if isClusterAgent {

	} else {
		req := ct.client.ControlsApi.GetAgentInitControls(context.Background())
		req = req.ModelInitAgentReq(
			*openapi.NewModelInitAgentReq(
				getMaxAllocatable(),
				nodeId,
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
			agentId := openapi.NewModelAgentId(getMaxAllocatable(), nodeId)
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
			agentId := openapi.NewModelAgentId(getMaxAllocatable(), nodeId)
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

	return nil
}

const (
	MAX_AGENT_WORKLOAD = 2
)

func GetScannersWorkloads() int32 {
	res := int32(0)
	secret := host.GetSecretScannerJobCount()
	malware := host.GetMalwareScannerJobCount()
	vuln := host.GetPackageScannerJobCount()
	//TODO: Add more scanners workload
	logrus.Infof("GetScannersWorkloads secret: %d malware: %d package: %d", secret, malware, vuln)
	res = secret + malware + vuln
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
	workload := MAX_AGENT_WORKLOAD - GetScannersWorkloads() - getUpgradeWorkload()
	if workload <= 0 {
		workload = 0
	}
	logrus.Infof("Workload: %v\n", workload)
	return workload
}
