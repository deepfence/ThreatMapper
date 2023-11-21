//go:build !dummy
// +build !dummy

package router

import (
	"context"
	"encoding/json"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"math/rand"
	"strconv"
	"sync/atomic"
	"time"

	cloud_util "github.com/deepfence/cloud-scanner/util"
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

func (ct *OpenapiClient) StartCloudControlsWatching(nodeId string, version string, config cloud_util.Config) error {
	go func() {
		req := ct.API().CloudNodesAPI.RegisterCloudNodeAccount(context.Background())
		ticker := time.NewTicker(1 * time.Minute)
		for {
			select {
			case <-ticker.C:
			case <-ct.stopControlListening:
				break
			}
			if len(config.MultipleAccountIds) > 0 {
				monAccounts := map[string]string{}
				for _, accId := range config.MultipleAccountIds {
					monAccounts[accId] = cloud_util.GetNodeId(config.CloudProvider, accId)
				}

				req = req.ModelCloudNodeAccountRegisterReq(
					openapi.ModelCloudNodeAccountRegisterReq{
						CloudAccount:        config.CloudMetadata.ID,
						CloudProvider:       config.CloudProvider,
						MonitoredAccountIds: monAccounts,
						NodeId:              nodeId,
						OrgAccId:            &config.OrgAccountId,
						Version:             &version,
					},
				)
			} else {
				req = req.ModelCloudNodeAccountRegisterReq(
					openapi.ModelCloudNodeAccountRegisterReq{
						CloudAccount:  config.CloudMetadata.ID,
						CloudProvider: config.CloudProvider,
						NodeId:        nodeId,
					},
				)
			}

			out, _, err := ct.API().CloudNodesAPI.RegisterCloudNodeAccountExecute(req)
			if err != nil {
				log.Error().Msgf("Request errored on registering on management console: %s", err.Error())
			}

			scansResponse, err := convertType[openapi.ModelCloudNodeAccountRegisterResp, cloud_util.ScansResponse](*out)
			if err != nil {
				log.Error().Msgf("convert type failed for scanDetails")
			}
			log.Debug().Msgf("Adding scans data to pending scans: %+v", scansResponse.Data.Scans)

			for scanId, scanDetails := range scansResponse.Data.Scans {
				log.Debug().Msgf("Checking if pending scan for scan id: %s", scanId)

				if scanDetails.StopRequested == true {
					payload, _ := json.Marshal(map[string]string{
						"scan_id": scanId,
					})
					action := openapi.ControlsAction{
						Id:             int32(ctl.StopComplianceScan),
						RequestPayload: string(payload),
					}
					log.Info().Msgf("Execute :%v", action.Id)
					err := ApplyControl(action)
					if err != nil {
						log.Error().Msgf("Control %v failed: %v\n", action, err)
					}
					continue
				}

				payload, _ := json.Marshal(scanDetails)
				action := openapi.ControlsAction{
					Id:             int32(ctl.StartComplianceScan),
					RequestPayload: string(payload),
				}
				log.Info().Msgf("Execute :%v", action.Id)
				err := ApplyControl(action)
				if err != nil {
					log.Error().Msgf("Control %v failed: %v\n", action, err)
				}

			}

			//if out.GetData().LogAction.Id != 0 && out.GetData().LogAction.RequestPayload != "" {
			//	var r ctl.SendAgentDiagnosticLogsRequest
			//	err = json.Unmarshal([]byte(out.GetData().LogAction.RequestPayload), &r)
			//	if err != nil {
			//		log.Error().Msgf("Error in unmarshalling log action payload: %v", err)
			//	} else {
			//		err = c.sendDiagnosticLogs(r, []string{"/home/deepfence/.steampipe/logs"}, []string{})
			//		if err != nil {
			//			log.Error().Msgf("Error in sending diagnostic logs: %v", err)
			//		}
			//	}
			//}

			doRefresh, err := strconv.ParseBool(scansResponse.Data.Refresh)
			if doRefresh {
				payload, _ := json.Marshal(map[string]string{})
				action := openapi.ControlsAction{
					Id:             int32(ctl.StartComplianceScan),
					RequestPayload: string(payload),
				}
				log.Info().Msgf("Execute :%v", action.Id)
				err := ApplyControl(action)
				if err != nil {
					log.Error().Msgf("Control %v failed: %v\n", action, err)
				}
			}
		}

	}()
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

func convertType[T any, Y any](input T) (Y, error) {
	var res Y
	docBytes, err := json.Marshal(input)
	if err != nil {
		log.Error().Msg(err.Error())
		return res, err
	}
	json.Unmarshal(docBytes, &res)
	return res, nil
}
