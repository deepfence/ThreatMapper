package controls

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	sdkUtils "github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

var controls map[ctl.ActionID]func(req []byte) error
var controls_guard sync.RWMutex

func RegisterControl[T ctl.StartVulnerabilityScanRequest | ctl.StartSecretScanRequest | ctl.StartComplianceScanRequest | ctl.StartMalwareScanRequest | ctl.StartAgentUpgradeRequest](id ctl.ActionID, callback func(req T) error) error {

	controls_guard.Lock()
	defer controls_guard.Unlock()
	if controls[id] != nil {
		return fmt.Errorf("action %v already registered", id)
	}
	controls[id] = func(req []byte) error {
		var typedReq T
		err := json.Unmarshal(req, &typedReq)
		if err != nil {
			return err
		}
		return callback(typedReq)
	}

	log.Info().Msgf("registered controls for action %v", ctl.ActionID(id))

	return nil
}

func ApplyControl(req ctl.Action) error {
	controls_guard.RLock()
	defer controls_guard.RUnlock()
	log.Info().Msgf("apply control req: %+v", req)
	return controls[ctl.ActionID(req.ID)]([]byte(req.RequestPayload))
}

func init() {
	controls = map[ctl.ActionID]func(req []byte) error{}
}

func ConsoleActionSetup(pub *kafka.Publisher) error {
	// for vulnerability scan
	err := RegisterControl(ctl.StartVulnerabilityScan,
		func(req ctl.StartVulnerabilityScanRequest) error {
			metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
			log.Info().Msgf("payload: %+v", req.BinArgs)
			data, err := json.Marshal(req.BinArgs)
			if err != nil {
				log.Error().Msg(err.Error())
				return err
			}
			if err := utils.PublishNewJob(pub, metadata, sdkUtils.GenerateSBOMTask, data); err != nil {
				log.Error().Msg(err.Error())
				return err
			}
			return nil
		})
	if err != nil {
		return err
	}

	// for secret scan
	err = RegisterControl(ctl.StartSecretScan,
		func(req ctl.StartSecretScanRequest) error {
			metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
			log.Info().Msgf("payload: %+v", req.BinArgs)
			data, err := json.Marshal(req.BinArgs)
			if err != nil {
				log.Error().Msg(err.Error())
				return err
			}
			if err := utils.PublishNewJob(pub, metadata, sdkUtils.SecretScanTask, data); err != nil {
				log.Error().Msg(err.Error())
				return err
			}
			return nil
		})
	if err != nil {
		return err
	}

	return nil
}
