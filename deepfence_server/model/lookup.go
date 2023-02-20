package model

// "nested_json" fields are string json maps
// that can be unmarshalled on the fly

type Cypherable interface {
	NodeType() string
}

type PresentationContext struct {
	MetadataOrder map[string]int    `json:"metadata_order" required:"true"`
	IDToLabels    map[string]string `json:"id_to_labels" required:"true"`
}

type Metadata map[string]interface{}

type KubernetesCluster struct {
	ID       string         `json:"node_id" required:"true"`
	Name     string         `json:"node_name" required:"true"`
	Hosts    []Host         `json:"containers" required:"true"`
	Metadata Metadata       `json:"cloud_metadata" required:"true" nested_json:"true"`
	Metrics  ComputeMetrics `json:"metrics" required:"true"`
}

func (KubernetesCluster) NodeType() string {
	return "KubernetesCluster"
}

type RegularScanStatus struct {
	VulnerabilitiesCount    int    `json:"vulnerabilities_count"  required:"true"`
	VulnerabilityScanStatus string `json:"vulnerability_scan_status" required:"true"`
	SecretsCount            int    `json:"secrets_count" required:"true"`
	SecretScanStatus        string `json:"secret_scan_status" required:"true"`
	MalwaresCount           int    `json:"malwares_count" required:"true"`
	MalwareScanStatus       string `json:"malware_scan_status" required:"true"`
	CompliancesCount        int    `json:"compliances_count" required:"true"`
	ComplianceScanStatus    string `json:"compliance_scan_status" required:"true"`
}

type Host struct {
	ID              string           `json:"node_id" required:"true"`
	Name            string           `json:"host_name" required:"true"`
	Containers      []Container      `json:"containers" required:"true"`
	Processes       []Process        `json:"processes" required:"true"`
	Pods            []Pod            `json:"pods" required:"true"`
	ContainerImages []ContainerImage `json:"container_images" required:"true"`
	Metadata        Metadata         `json:"cloud_metadata" required:"true" nested_json:"true"`
	Metrics         ComputeMetrics   `json:"metrics" required:"true"`
	RegularScanStatus
}

type RegistryAccount struct {
	ID              string           `json:"node_id" required:"true"`
	Name            string           `json:"host_name" required:"true"`
	ContainerImages []ContainerImage `json:"container_images" required:"true"`
}

func (RegistryAccount) NodeType() string {
	return "RegistryAccount"
}

func (Host) NodeType() string {
	return "Node"
}

type EndpointID struct {
	Endpoint string `json:"endpoint" required:"true"`
	Type     string `json:"type" required:"true"`
}

type Connection struct {
	RemoteEndpoint EndpointID `json:"remote_endpoint" required:"true"`
	Port           int16      `json:"port" required:"true"`
	ActiveCount    int        `json:"active_count" required:"true"`
}

type Pod struct {
	ID         string         `json:"node_id" required:"true"`
	Name       string         `json:"kubernetes_name" required:"true"`
	Namespace  string         `json:"kubernetes_namespace" required:"true"`
	Host       string         `json:"host_node_id" required:"true"`
	Metrics    ComputeMetrics `json:"metrics" required:"true"`
	Containers []Container    `json:"containers" required:"true"`
	Processes  []Process      `json:"processes" required:"true" required:"true"`
	Metadata   Metadata       `json:"metadata" required:"true" nested_json:"true"`
}

func (Pod) NodeType() string {
	return "Pod"
}

type Container struct {
	ID             string         `json:"node_id" required:"true"`
	Name           string         `json:"docker_container_name" required:"true"`
	ContainerImage ContainerImage `json:"image" required:"true"`
	Processes      []Process      `json:"processes" required:"true"`
	Metrics        ComputeMetrics `json:"metrics" required:"true"`
	Metadata       Metadata       `json:"metadata" required:"true" nested_json:"true"`
	DockerLabels   Metadata       `json:"docker_labels" required:"true" nested_json:"true"`
	HostName       string         `json:"host_name" required:"true"`
	RegularScanStatus
}

func (Container) NodeType() string {
	return "Container"
}

type Process struct {
	ID           string         `json:"node_id" required:"true"`
	Name         string         `json:"name" required:"true"`
	PID          string         `json:"pid" required:"true"`
	Command      string         `json:"cmdline" required:"true"`
	PPID         string         `json:"ppid" required:"true"`
	ThreadNumber int            `json:"threads" required:"true"`
	Metrics      ComputeMetrics `json:"metrics" required:"true"`
	Metadata     Metadata       `json:"metadata" required:"true" nested_json:"true"`
}

func (Process) NodeType() string {
	return "Process"
}

type ContainerImage struct {
	ID       string         `json:"node_id" required:"true"`
	Name     string         `json:"docker_image_name" required:"true"`
	Tag      string         `json:"docker_image_tag" required:"true"`
	Size     string         `json:"docker_image_size" required:"true"`
	Metrics  ComputeMetrics `json:"metrics" required:"true"`
	Metadata Metadata       `json:"metadata" required:"true" nested_json:"true"`
	RegularScanStatus
}

func (ContainerImage) NodeType() string {
	return "ContainerImage"
}

type ComputeMetrics struct {
	CPUPercent float32 `json:"cpu_percent" required:"true"`
	MemoryMB   float32 `json:"memory_mb" required:"true"`
}
