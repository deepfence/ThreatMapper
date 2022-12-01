package controls

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

type ActionID int

const (
	StartCVEScan ActionID = iota
	StartSecretScan
	StartComplianceScan
)

type StartCVEScanRequest struct{}
type StartSecretScanRequest struct{}
type StartComplianceScanRequest struct{}

type Action struct {
	ID             ActionID
	RequestPayload []byte
}

var controls map[ActionID]func(req []byte) error
var controls_guard sync.RWMutex

func RegisterControl[T StartCVEScanRequest | StartSecretScanRequest | StartComplianceScanRequest](id ActionID, callback func(req T) error) error {

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

func ApplyControl(req Action) error {
	controls_guard.RLock()
	defer controls_guard.RUnlock()
	return controls[req.ID](req.RequestPayload)
}

type AgentControls struct {
	BeatRate time.Duration `json:"beatrate"`
	Commands []Action      `json:"commands"`
}

func (ac AgentControls) ToBytes() ([]byte, error) {
	return json.Marshal(ac)
}

func init() {
	controls = map[ActionID]func(req []byte) error{}
}
