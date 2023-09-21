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
	StartAgentUpgrade
	SendAgentDiagnosticLogs
	StartAgentPlugin
	StopAgentPlugin
	UpgradeAgentPlugin
	StopSecretScan
	StopMalwareScan
	StopVulnerabilityScan
	StopComplianceScan
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
	NodeId   string            `json:"node_id" required:"true"`
	NodeType ScanResource      `json:"node_type" required:"true"`
	BinArgs  map[string]string `json:"bin_args" required:"true"`
}

type StartSecretScanRequest struct {
	NodeId   string            `json:"node_id" required:"true"`
	NodeType ScanResource      `json:"node_type" required:"true"`
	BinArgs  map[string]string `json:"bin_args" required:"true"`
}

type StartComplianceScanRequest struct {
	NodeId   string            `json:"node_id" required:"true"`
	NodeType ScanResource      `json:"node_type" required:"true"`
	BinArgs  map[string]string `json:"bin_args" required:"true"`
}

type StartMalwareScanRequest struct {
	NodeId   string            `json:"node_id" required:"true"`
	NodeType ScanResource      `json:"node_type" required:"true"`
	BinArgs  map[string]string `json:"bin_args" required:"true"`
}

type StopSecretScanRequest StartSecretScanRequest
type StopMalwareScanRequest StartSecretScanRequest
type StopVulnerabilityScanRequest StartSecretScanRequest
type StopComplianceScanRequest StartSecretScanRequest

type SendAgentDiagnosticLogsRequest struct {
	NodeId    string       `json:"node_id" required:"true"`
	NodeType  ScanResource `json:"node_type" required:"true"`
	UploadURL string       `json:"upload_url" required:"true"`
	FileName  string       `json:"file_name" required:"true"`
	Tail      string       `json:"tail" required:"true"`
}

type StartAgentUpgradeRequest struct {
	HomeDirectoryUrl string `json:"home_directory_url" required:"true"`
	Version          string `json:"version" required:"true"`
}

type EnableAgentPluginRequest struct {
	PluginName string `json:"plugin_name" required:"true"`
	Version    string `json:"version" required:"true"`
	BinUrl     string `json:"bin_url" required:"true"`
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

func GetBinArgs(T interface{}) map[string]string {
	switch T.(type) {
	case StartVulnerabilityScanRequest:
		return T.(StartVulnerabilityScanRequest).BinArgs
	case StartSecretScanRequest:
		return T.(StartSecretScanRequest).BinArgs
	case StartComplianceScanRequest:
		return T.(StartComplianceScanRequest).BinArgs
	case StartMalwareScanRequest:
		return T.(StartMalwareScanRequest).BinArgs
	case StopSecretScanRequest:
		return T.(StopSecretScanRequest).BinArgs
	case StopMalwareScanRequest:
		return T.(StopVulnerabilityScanRequest).BinArgs
	case StopVulnerabilityScanRequest:
		return T.(StopVulnerabilityScanRequest).BinArgs
	}
	return nil
}
