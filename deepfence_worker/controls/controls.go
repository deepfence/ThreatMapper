package controls

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	sdkUtils "github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

var controls map[ctl.ActionID]func(ctx context.Context, req []byte) error
var controls_guard sync.RWMutex

func RegisterControl[T ctl.StartVulnerabilityScanRequest | ctl.StartSecretScanRequest |
	ctl.StartComplianceScanRequest | ctl.StartMalwareScanRequest |
	ctl.StartAgentUpgradeRequest | ctl.StopSecretScanRequest |
	ctl.StopMalwareScanRequest | ctl.StopVulnerabilityScanRequest](id ctl.ActionID,
	callback func(ctx context.Context, req T) error) error {

	controls_guard.Lock()
	defer controls_guard.Unlock()
	if controls[id] != nil {
		return fmt.Errorf("action %v already registered", id)
	}
	controls[id] = func(ctx context.Context, req []byte) error {
		var typedReq T
		err := json.Unmarshal(req, &typedReq)
		if err != nil {
			return err
		}
		return callback(ctx, typedReq)
	}

	log.Info().Msgf("registered controls for action %v", ctl.ActionID(id))

	return nil
}

func ApplyControl(ctx context.Context, req ctl.Action) error {
	controls_guard.RLock()
	defer controls_guard.RUnlock()
	f, has := controls[ctl.ActionID(req.ID)]
	if has {
		log.Info().Msgf("apply control req: %+v", req)
		return f(ctx, []byte(req.RequestPayload))
	}
	return fmt.Errorf("apply control req: %+v not implemented", req)
}

func init() {
	controls = map[ctl.ActionID]func(ctx context.Context, req []byte) error{}
}

func ConsoleActionSetup() error {
	// for vulnerability scan
	err := RegisterControl(ctl.StartVulnerabilityScan,
		GetRegisterControlFunc[ctl.StartVulnerabilityScanRequest](sdkUtils.GenerateSBOMTask))
	if err != nil {
		return err
	}

	// for secret scan
	err = RegisterControl(ctl.StartSecretScan,
		GetRegisterControlFunc[ctl.StartSecretScanRequest](sdkUtils.SecretScanTask))
	if err != nil {
		return err
	}

	// for malware scan
	err = RegisterControl(ctl.StartMalwareScan,
		GetRegisterControlFunc[ctl.StartMalwareScanRequest](sdkUtils.MalwareScanTask))
	if err != nil {
		return err
	}

	err = RegisterControl(ctl.StopSecretScan,
		GetRegisterControlFunc[ctl.StopSecretScanRequest](sdkUtils.StopSecretScanTask))
	if err != nil {
		return err
	}

	err = RegisterControl(ctl.StopMalwareScan,
		GetRegisterControlFunc[ctl.StopMalwareScanRequest](sdkUtils.StopMalwareScanTask))
	if err != nil {
		return err
	}

	err = RegisterControl(ctl.StopVulnerabilityScan,
		GetRegisterControlFunc[ctl.StopVulnerabilityScanRequest](sdkUtils.StopVulnerabilityScanTask))
	if err != nil {
		return err
	}

	return nil
}

func GetRegisterControlFunc[T ctl.StartVulnerabilityScanRequest | ctl.StartSecretScanRequest |
	ctl.StartComplianceScanRequest | ctl.StartMalwareScanRequest |
	ctl.StopSecretScanRequest | ctl.StopMalwareScanRequest |
	ctl.StopVulnerabilityScanRequest](
	task string) func(ctx context.Context, req T) error {

	controlFunc := func(ctx context.Context, req T) error {
		log := log.WithCtx(ctx)
		BinArgs := ctl.GetBinArgs(req)
		log.Info().Msgf("enqueue %s payload: %+v", task, BinArgs)
		data, err := json.Marshal(BinArgs)
		if err != nil {
			log.Error().Msg(err.Error())
			return err
		}
		worker, err := directory.Worker(ctx)
		if err != nil {
			log.Error().Msg(err.Error())
			return err
		}
		if err := worker.Enqueue(task, data, utils.DefaultTaskOpts()...); err != nil {
			log.Error().Msg(err.Error())
			return err
		}
		return nil
	}
	return controlFunc
}
