package controls

import (
	"encoding/json"
	"fmt"
	"sync"

	openapi "github.com/deepfence/ThreatMapper/deepfence_server_client"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
)

var controls map[ctl.ActionID]func(req []byte) error
var controls_guard sync.RWMutex

func RegisterControl[T ctl.StartCVEScanRequest | ctl.StartSecretScanRequest | ctl.StartComplianceScanRequest](id ctl.ActionID, callback func(req T) error) error {

	controls_guard.Lock()
	defer controls_guard.Unlock()
	if controls[id] != nil {
		return fmt.Errorf("Action %v already registered", id)
	}
	controls[id] = func(req []byte) error {
		var typedReq T
		json.Unmarshal(req, typedReq)
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
