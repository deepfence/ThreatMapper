package controls

import (
	"encoding/json"
	"fmt"
	"sync"

	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
)

var controls map[ctl.ActionID]func(req []byte) error
var controls_guard sync.RWMutex

func RegisterControl[T ctl.StartVulnerabilityScanRequest | ctl.StartSecretScanRequest | ctl.StartComplianceScanRequest | ctl.StartMalwareScanRequest | ctl.StartAgentUpgradeRequest](id ctl.ActionID, callback func(req T) error) error {

	controls_guard.Lock()
	defer controls_guard.Unlock()
	if controls[id] != nil {
		return fmt.Errorf("Action %v already registered", id)
	}
	controls[id] = func(req []byte) error {
		var typedReq T
		err := json.Unmarshal(req, &typedReq)
		if err != nil {
			return err
		}
		return callback(typedReq)
	}

	return nil
}

func ApplyControl(req ctl.Action) error {
	controls_guard.RLock()
	defer controls_guard.RUnlock()
	return controls[ctl.ActionID(req.ID)]([]byte(req.RequestPayload))
}

func init() {
	controls = map[ctl.ActionID]func(req []byte) error{}
}

func ConsoleActionSetup() error {
	err := RegisterControl(ctl.StartVulnerabilityScan,
		func(req ctl.StartAgentUpgradeRequest) error {
			//TODO
			//return kubernetes.StartClusterAgentUpgrade(req)
			return nil
		})
	if err != nil {
		return err
	}
	return nil
}
