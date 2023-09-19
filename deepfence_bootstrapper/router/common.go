package router

import (
	"encoding/json"
	"fmt"
	"sync"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	openapi "github.com/deepfence/golang_deepfence_sdk/client"
)

const (
	HostMountDir = "/fenced/mnt/host"
)

var controls map[ctl.ActionID]func(req []byte) error
var controls_guard sync.RWMutex

func RegisterControl[T ctl.StartVulnerabilityScanRequest |
	ctl.StartSecretScanRequest |
	ctl.StartComplianceScanRequest |
	ctl.StartMalwareScanRequest |
	ctl.StartAgentUpgradeRequest |
	ctl.SendAgentDiagnosticLogsRequest |
	ctl.DisableAgentPluginRequest |
	ctl.EnableAgentPluginRequest |
	ctl.StopSecretScanRequest |
	ctl.StopMalwareScanRequest |
	ctl.StopVulnerabilityScanRequest |
	ctl.StopComplianceScanRequest](id ctl.ActionID, callback func(req T) error) error {

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

func ApplyControl(req openapi.ControlsAction) error {
	controls_guard.RLock()
	defer controls_guard.RUnlock()
	return controls[ctl.ActionID(req.GetId())]([]byte(req.GetRequestPayload()))
}

func init() {
	controls = map[ctl.ActionID]func(req []byte) error{}
}
