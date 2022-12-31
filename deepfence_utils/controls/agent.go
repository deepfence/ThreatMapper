package controls

import (
	"encoding/json"
)

type ActionID int

const (
	StartCVEScan ActionID = iota
	StartSecretScan
	StartMalwareScan
	StartComplianceScan
)

type StartCVEScanRequest struct{}
type StartSecretScanRequest struct{}
type StartMalwareScanRequest struct{}
type StartComplianceScanRequest struct{}

type Action struct {
	ID             ActionID `json:"id"`
	RequestPayload []byte   `json:"request_payload"`
}

type AgentControls struct {
	BeatRateSec int32    `json:"beatrate"`
	Commands    []Action `json:"commands"`
}

func (ac AgentControls) ToBytes() ([]byte, error) {
	return json.Marshal(ac)
}
