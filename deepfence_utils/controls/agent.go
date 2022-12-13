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

type ScanResource int

const (
	Container ScanResource = iota
	Image
	Host
)

type StartVulnerabilityScanRequest struct{}
type StartSecretScanRequest struct {
	ResourceId   string            `json:"resource_id" required:"true"`
	ResourceType ScanResource      `json:"resource_type" required:"true"`
	BinArgs      map[string]string `json:"bin_args" required:"true"`
	Hostname     string            `json:"hostname" required:"true"`
}
type StartComplianceScanRequest struct{}
type StartMalwareScanRequest struct{}

type Action struct {
	ID             ActionID `json:"id" required:"true"`
	RequestPayload string   `json:"request_payload" required:"true"`
}

type AgentControls struct {
	BeatRateSec int32    `json:"beatrate" required:"true"`
	Commands    []Action `json:"commands" required:"true"`
}

func (ac AgentControls) ToBytes() ([]byte, error) {
	return json.Marshal(ac)
}
