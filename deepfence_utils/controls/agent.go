package controls

import (
	"encoding/json"
	"time"
)

type ActionID int

const (
	StartVulnerabilityScan ActionID = iota
	StartSecretScan
	StartComplianceScan
	StartMalwareScan
	StartAgentUpgrade
	SendAgentDiagnosticLogs
	StartAgentPlugin
	StopAgentPlugin
	UpgradeAgentPlugin
	StopSecretScan
	StopMalwareScan
	StopVulnerabilityScan
	StopComplianceScan

	UpdateAgentThreatIntel
)

type ScanResource int

const (
	Container ScanResource = iota
	Image
	Host
	CloudAccount
	KubernetesCluster
	RegistryAccount
	Pod
)

func ResourceTypeToNeo4j(t ScanResource) string {
	switch t {
	case Container:
		return "Container"
	case Image:
		return "ContainerImage"
	case Host:
		return "Node"
	case CloudAccount:
		return "CloudNode"
	case KubernetesCluster:
		return "KubernetesCluster"
	case RegistryAccount:
		return "RegistryAccount"
	case Pod:
		return "Pod"
	}
	return ""
}

func ResourceTypeToString(t ScanResource) string {
	switch t {
	case Container:
		return "container"
	case Image:
		return "image"
	case Host:
		return "host"
	case CloudAccount:
		return "cloud_account"
	case KubernetesCluster:
		return "cluster"
	case RegistryAccount:
		return "registry"
	case Pod:
		return "pod"
	}
	return ""
}

func StringToResourceType(s string) ScanResource {
	switch s {
	case "container":
		return Container
	case "container_image":
		return Image
	case "image":
		return Image
	case "host":
		return Host
	case "cluster":
		return KubernetesCluster
	case "registry":
		return RegistryAccount
	case "cloud_account":
		return CloudAccount
	case "pod":
		return Pod
	}
	return -1
}

type StartVulnerabilityScanRequest struct {
	NodeID   string            `json:"node_id" required:"true"`
	NodeType ScanResource      `json:"node_type" required:"true"`
	BinArgs  map[string]string `json:"bin_args" required:"true"`
}

type StartSecretScanRequest struct {
	NodeID   string            `json:"node_id" required:"true"`
	NodeType ScanResource      `json:"node_type" required:"true"`
	BinArgs  map[string]string `json:"bin_args" required:"true"`
}

type StartComplianceScanRequest struct {
	NodeID   string            `json:"node_id" required:"true"`
	NodeType ScanResource      `json:"node_type" required:"true"`
	BinArgs  map[string]string `json:"bin_args" required:"true"`
}

type StartMalwareScanRequest struct {
	NodeID   string            `json:"node_id" required:"true"`
	NodeType ScanResource      `json:"node_type" required:"true"`
	BinArgs  map[string]string `json:"bin_args" required:"true"`
}

type StopSecretScanRequest StartSecretScanRequest
type StopMalwareScanRequest StartSecretScanRequest
type StopVulnerabilityScanRequest StartSecretScanRequest
type StopComplianceScanRequest StartSecretScanRequest

type SendAgentDiagnosticLogsRequest struct {
	NodeID    string       `json:"node_id" required:"true"`
	NodeType  ScanResource `json:"node_type" required:"true"`
	UploadURL string       `json:"upload_url" required:"true"`
	FileName  string       `json:"file_name" required:"true"`
	Tail      string       `json:"tail" required:"true"`
}

type StartAgentUpgradeRequest struct {
	HomeDirectoryURL string `json:"home_directory_url" required:"true"`
	Version          string `json:"version" required:"true"`
}

type EnableAgentPluginRequest struct {
	PluginName string `json:"plugin_name" required:"true"`
	Version    string `json:"version" required:"true"`
	BinURL     string `json:"bin_url" required:"true"`
}

type DisableAgentPluginRequest struct {
	PluginName string `json:"plugin_name" required:"true"`
}

type Action struct {
	ID             ActionID `json:"id" required:"true"`
	RequestPayload string   `json:"request_payload" required:"true"`
}

type AgentBeat struct {
	BeatRateSec int32 `json:"beatrate" required:"true"`
}

type AgentControls struct {
	BeatRateSec int32    `json:"beatrate" required:"true"`
	Commands    []Action `json:"commands" required:"true"`
}

func (ac AgentControls) ToBytes() ([]byte, error) {
	return json.Marshal(ac)
}

func GetBinArgs(t interface{}) map[string]string {
	switch val := t.(type) {
	case StartVulnerabilityScanRequest:
		return val.BinArgs
	case StartSecretScanRequest:
		return val.BinArgs
	case StartComplianceScanRequest:
		return val.BinArgs
	case StartMalwareScanRequest:
		return val.BinArgs
	case StopSecretScanRequest:
		return val.BinArgs
	case StopMalwareScanRequest:
		return val.BinArgs
	case StopVulnerabilityScanRequest:
		return val.BinArgs
	}
	return nil
}

type ThreatIntelInfo struct {
	SecretsRulesURL   string `json:"secret_scanner_rules_url" required:"true"`
	SecretsRulesHash  string `json:"secret_scanner_rules_hash" required:"true"`
	MalwareRulesURL   string `json:"malware_scanner_rules_url" required:"true"`
	MalwareRulesHash  string `json:"malware_scanner_rules_hash" required:"true"`
	CloudControlsURL  string `json:"cloud_controls_url" required:"true"`
	CloudControlsHash string `json:"cloud_controls_hash" required:"true"`
	UpdatedAt         int64  `json:"updated_at" required:"true"`
}

func (ThreatIntelInfo) GetLabel() string {
	return "ThreatIntelInfo"
}

func (ThreatIntelInfo) GetAction() ActionID {
	return UpdateAgentThreatIntel
}

func (e ThreatIntelInfo) GetNodeID() string {
	return "latest"
}

func (e ThreatIntelInfo) HasPolicies() bool {
	return false
}

func (e ThreatIntelInfo) SetEmptyUpdatedAts(now time.Time) ThreatIntelInfo {
	if e.UpdatedAt == 0 {
		e.UpdatedAt = now.UnixMilli()
	}
	return e
}

func (e ThreatIntelInfo) SetNodeID(nodeID string) ThreatIntelInfo {
	// Stub implementation
	return e
}
