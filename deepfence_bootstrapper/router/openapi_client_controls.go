//go:build !dummy
// +build !dummy

package router

import (
	"context"
	"math/rand"
	"sync/atomic"
	"time"

	openapi "github.com/deepfence/golang_deepfence_sdk/client"
	"github.com/rs/zerolog/log"
)

func (ct *OpenapiClient) StartControlsWatching(nodeID string, isClusterAgent bool, version string) error {
	if isClusterAgent {

	} else {
		req := ct.API().ControlsAPI.GetAgentInitControls(context.Background())
		req = req.ModelInitAgentReq(
			*openapi.NewModelInitAgentReq(
				getMaxAllocatable(),
				nodeID,
				version,
			),
		)
		ctl, _, err := ct.API().ControlsAPI.GetAgentInitControlsExecute(req)

		if err != nil {
			return err
		}

		ct.publishInterval.Store(ctl.Beatrate)

		for _, action := range ctl.Commands {
			log.Info().Msgf("Init execute :%v", action.Id)
			err := ApplyControl(action)
			if err != nil {
				log.Error().Msgf("Control %v failed: %v\n", action, err)
			}
		}
	}

	if isClusterAgent {
		go func() {
			req := ct.API().ControlsAPI.GetKubernetesClusterControls(context.Background())
			agentID := openapi.NewModelAgentID(getMaxAllocatable(), nodeID)
			req = req.ModelAgentID(*agentID)
			ticker := time.NewTicker(time.Second * time.Duration(ct.PublishInterval()/2))
			for {
				ticker.Reset(time.Second * time.Duration(ct.PublishInterval()/2))
				select {
				case <-ticker.C:
				case <-ct.stopControlListening:
					break
				}
				agentID.SetAvailableWorkload(getMaxAllocatable())
				req = req.ModelAgentID(*agentID)
				ctl, _, err := ct.API().ControlsAPI.GetKubernetesClusterControlsExecute(req)
				if err != nil {
					log.Error().Msgf("Getting controls failed: %v\n", err)
					continue
				}

				ct.publishInterval.Store(ctl.Beatrate)

				for _, action := range ctl.Commands {
					log.Info().Msgf("Execute :%v", action.Id)
					err := ApplyControl(action)
					if err != nil {
						log.Error().Msgf("Control %v failed: %v\n", action, err)
					}
				}
			}
		}()
	} else {
		go func() {
			req := ct.API().ControlsAPI.GetAgentControls(context.Background())
			agentID := openapi.NewModelAgentID(getMaxAllocatable(), nodeID)
			req = req.ModelAgentID(*agentID)
			ticker := time.NewTicker(time.Second * time.Duration(ct.PublishInterval()/2))
			for {
				ticker.Reset(time.Second * time.Duration(ct.PublishInterval()/2))
				select {
				case <-ticker.C:
				case <-ct.stopControlListening:
					break
				}
				agentID.SetAvailableWorkload(getMaxAllocatable())
				req = req.ModelAgentID(*agentID)
				ctl, _, err := ct.API().ControlsAPI.GetAgentControlsExecute(req)
				if err != nil {
					log.Error().Msgf("Getting controls failed: %v\n", err)
					randomDelay := rand.Intn(int(ct.PublishInterval() / 2))
					time.Sleep(time.Duration(randomDelay) * time.Second)
					continue
				}

				ct.publishInterval.Store(ctl.Beatrate)

				for _, action := range ctl.Commands {
					log.Info().Msgf("Execute :%v", action.Id)
					err := ApplyControl(action)
					if err != nil {
						log.Error().Msgf("Control %v failed: %v\n", action, err)
					}
				}
			}
		}()
	}

	return nil
}

const (
	MaxAgentWorkload = 2
)

func GetScannersWorkloads() int32 {
	res := int32(0)
	secret := GetSecretScannerJobCount()
	malware := GetMalwareScannerJobCount()
	vuln := GetPackageScannerJobCount()
	//TODO: Add more scanners workload
	log.Info().Msgf("workloads = vuln: %d, secret: %d, malware: %d", vuln, secret, malware)
	res = secret + malware + vuln
	return res
}

var upgrade atomic.Bool

func SetUpgrade() {
	upgrade.Store(true)
}

func UnsetUpgrade() {
	upgrade.Store(false)
}

func getUpgradeWorkload() int32 {
	if upgrade.Load() {
		return MaxAgentWorkload
	}
	return 0
}

func getMaxAllocatable() int32 {
	workload := MaxAgentWorkload - GetScannersWorkloads() - getUpgradeWorkload()
	if workload <= 0 {
		workload = 0
	}
	log.Info().Msgf("Workload: %v\n", workload)
	return workload
}
