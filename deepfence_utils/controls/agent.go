package controls

import (
	"encoding/json"
)

type ActionID int

const (
	StartVulnerabilityScan ActionID = iota
	StartSecretScan
	StartComplianceScan
	StartMalwareScan
)

type StartVulnerabilityScanRequest struct{}
type StartSecretScanRequest struct{}
type StartComplianceScanRequest struct{}
type StartMalwareScanRequest struct{}

type Action struct {
	ID             ActionID `json:"id"`
	RequestPayload string   `json:"request_payload"`
}

type AgentControls struct {
	BeatRateSec int32    `json:"beatrate"`
	Commands    []Action `json:"commands"`
}

func (ac AgentControls) ToBytes() ([]byte, error) {
	return json.Marshal(ac)
}
