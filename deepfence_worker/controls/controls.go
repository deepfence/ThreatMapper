package controls

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	sdkUtils "github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/utils"
)

var controls map[ctl.ActionID]func(namespace string, req []byte) error
var controls_guard sync.RWMutex

func RegisterControl[T ctl.StartVulnerabilityScanRequest | ctl.StartSecretScanRequest |
	ctl.StartComplianceScanRequest | ctl.StartMalwareScanRequest |
	ctl.StartAgentUpgradeRequest | ctl.StopSecretScanRequest |
	ctl.StopMalwareScanRequest | ctl.StopVulnerabilityScanRequest](id ctl.ActionID,
	callback func(namespace string, req T) error) error {

	controls_guard.Lock()
	defer controls_guard.Unlock()
	if controls[id] != nil {
		return fmt.Errorf("action %v already registered", id)
	}
	controls[id] = func(namespace string, req []byte) error {
		var typedReq T
		err := json.Unmarshal(req, &typedReq)
		if err != nil {
			return err
		}
		return callback(namespace, typedReq)
	}

	log.Info().Msgf("registered controls for action %v", ctl.ActionID(id))

	return nil
}

func ApplyControl(namespace string, req ctl.Action) error {
	controls_guard.RLock()
	defer controls_guard.RUnlock()
	log.Info().Msgf("apply control req: %+v", req)
	return controls[ctl.ActionID(req.ID)](namespace, []byte(req.RequestPayload))
}

func init() {
	controls = map[ctl.ActionID]func(namespace string, req []byte) error{}
}

func ConsoleActionSetup(pub *kafka.Publisher) error {
	// for vulnerability scan
	err := RegisterControl(ctl.StartVulnerabilityScan,
		GetRegisterControlFunc[ctl.StartVulnerabilityScanRequest](pub,
			sdkUtils.GenerateSBOMTask))
	if err != nil {
		return err
	}

	// for secret scan
	err = RegisterControl(ctl.StartSecretScan,
		GetRegisterControlFunc[ctl.StartSecretScanRequest](pub,
			sdkUtils.SecretScanTask))
	if err != nil {
		return err
	}

	// for malware scan
	err = RegisterControl(ctl.StartMalwareScan,
		GetRegisterControlFunc[ctl.StartMalwareScanRequest](pub,
			sdkUtils.MalwareScanTask))
	if err != nil {
		return err
	}

	err = RegisterControl(ctl.StopSecretScan,
		GetRegisterControlFunc[ctl.StopSecretScanRequest](pub,
			sdkUtils.StopSecretScanTask))
	if err != nil {
		return err
	}

	err = RegisterControl(ctl.StopMalwareScan,
		GetRegisterControlFunc[ctl.StopMalwareScanRequest](pub,
			sdkUtils.StopMalwareScanTask))
	if err != nil {
		return err
	}

	err = RegisterControl(ctl.StopVulnerabilityScan,
		GetRegisterControlFunc[ctl.StopVulnerabilityScanRequest](pub,
			sdkUtils.StopVulnerabilityScanTask))
	if err != nil {
		return err
	}

	return nil
}

func GetRegisterControlFunc[T ctl.StartVulnerabilityScanRequest | ctl.StartSecretScanRequest |
	ctl.StartComplianceScanRequest | ctl.StartMalwareScanRequest |
	ctl.StopSecretScanRequest | ctl.StopMalwareScanRequest |
	ctl.StopVulnerabilityScanRequest](pub *kafka.Publisher,
	task string) func(namespace string, req T) error {

	controlFunc := func(namespace string, req T) error {
		metadata := map[string]string{directory.NamespaceKey: namespace}
		BinArgs := ctl.GetBinArgs(req)
		log.Info().Msgf("%s payload: %+v", task, BinArgs)
		data, err := json.Marshal(BinArgs)
		if err != nil {
			log.Error().Msg(err.Error())
			return err
		}
		if err := utils.PublishNewJob(pub, metadata, task, data); err != nil {
			log.Error().Msg(err.Error())
			return err
		}
		return nil
	}
	return controlFunc
}
