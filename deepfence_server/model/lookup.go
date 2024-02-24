package model

// "nested_json" fields are string json maps
// that can be unmarshalled on the fly

type Identifiable interface {
	id() string
}

type PresentationContext struct {
	MetadataOrder map[string]int    `json:"metadata_order" required:"true"`
	IDToLabels    map[string]string `json:"id_to_labels" required:"true"`
}

type Metadata map[string]interface{}

type KubernetesCluster struct {
	ID           string `json:"node_id" required:"true"`
	Name         string `json:"node_name" required:"true"`
	AgentRunning bool   `json:"agent_running" required:"true"`
	Hosts        []Host `json:"hosts" required:"true"`
}

func (KubernetesCluster) NodeType() string {
	return "KubernetesCluster"
}

func (KubernetesCluster) GetCategory() string {
	return ""
}

func (KubernetesCluster) GetJSONCategory() string {
	return ""
}

func (KubernetesCluster) ExtendedField() string {
	return ""
}

func (kc KubernetesCluster) id() string {
	return kc.ID
}

type BasicNode struct {
	NodeID   string `json:"node_id" required:"true"`
	Name     string `json:"name" required:"true"`
	NodeType string `json:"node_type" required:"true"`
	HostName string `json:"host_name" required:"true"`
}

type Connection struct {
	NodeName string        `json:"node_name"`
	NodeID   string        `json:"node_id"`
	Count    int64         `json:"count"`
	IPs      []interface{} `json:"ips"`
}

type ConnectionQueryResp struct {
	FromNodeID string        `json:"from_node_id"`
	NodeName   string        `json:"node_name"`
	NodeID     string        `json:"node_id"`
	Count      int64         `json:"count"`
	IPs        []interface{} `json:"ips"`
}

type Host struct {
	ID                              string           `json:"node_id" required:"true"`
	HostName                        string           `json:"host_name" required:"true"`
	NodeName                        string           `json:"node_name" required:"true"`
	Containers                      []Container      `json:"containers" required:"true"`
	Processes                       []Process        `json:"processes" required:"true"`
	Pods                            []Pod            `json:"pods" required:"true"`
	ContainerImages                 []ContainerImage `json:"container_images" required:"true"`
	KernelVersion                   string           `json:"kernel_version" required:"true"`
	Uptime                          int              `json:"uptime" required:"true"`
	Version                         string           `json:"version" required:"true"`
	AgentRunning                    bool             `json:"agent_running" required:"true"`
	IsConsoleVM                     bool             `json:"is_console_vm" required:"true"`
	LocalCIDRs                      []interface{}    `json:"local_cidr" required:"true"`
	Os                              string           `json:"os" required:"true"`
	LocalNetworks                   []interface{}    `json:"local_networks" required:"true"`
	InstanceID                      string           `json:"instance_id" required:"true"`
	CloudProvider                   string           `json:"cloud_provider" required:"true"`
	CloudAccountID                  string           `json:"cloud_account_id" required:"true"`
	InstanceType                    string           `json:"instance_type" required:"true"`
	PublicIP                        []interface{}    `json:"public_ip" required:"true"`
	PrivateIP                       []interface{}    `json:"private_ip" required:"true"`
	AvailabilityZone                string           `json:"availability_zone" required:"true"`
	KernelID                        string           `json:"kernel_id" required:"true"`
	CloudRegion                     string           `json:"cloud_region" required:"true"`
	ResourceGroup                   string           `json:"resource_group" required:"true"`
	CPUMax                          float64          `json:"cpu_max" required:"true"`
	CPUUsage                        float64          `json:"cpu_usage" required:"true"`
	MemoryMax                       int64            `json:"memory_max" required:"true"`
	MemoryUsage                     int64            `json:"memory_usage" required:"true"`
	VulnerabilitiesCount            int64            `json:"vulnerabilities_count" required:"true"`
	VulnerabilityScanStatus         string           `json:"vulnerability_scan_status" required:"true"`
	VulnerabilityLatestScanID       string           `json:"vulnerability_latest_scan_id" required:"true"`
	SecretsCount                    int64            `json:"secrets_count" required:"true"`
	SecretScanStatus                string           `json:"secret_scan_status" required:"true"`
	SecretLatestScanID              string           `json:"secret_latest_scan_id" required:"true"`
	MalwaresCount                   int64            `json:"malwares_count" required:"true"`
	MalwareScanStatus               string           `json:"malware_scan_status" required:"true"`
	MalwareLatestScanID             string           `json:"malware_latest_scan_id" required:"true"`
	CompliancesCount                int64            `json:"compliances_count" required:"true"`
	ComplianceScanStatus            string           `json:"compliance_scan_status" required:"true"`
	ComplianceLatestScanID          string           `json:"compliance_latest_scan_id" required:"true"`
	ExploitableVulnerabilitiesCount int64            `json:"exploitable_vulnerabilities_count" required:"true"`
	ExploitableSecretsCount         int64            `json:"exploitable_secrets_count" required:"true"`
	ExploitableMalwaresCount        int64            `json:"exploitable_malwares_count" required:"true"`
	WarnAlarmCount                  int64            `json:"warn_alarm_count" required:"true"`
	CloudWarnAlarmCount             int64            `json:"cloud_warn_alarm_count" required:"true"`
	InboundConnections              []Connection     `json:"inbound_connections" required:"true"`
	OutboundConnections             []Connection     `json:"outbound_connections" required:"true"`
}

func (Host) NodeType() string {
	return "Node"
}

func (Host) ExtendedField() string {
	return ""
}

func (Host) GetCategory() string {
	return ""
}

func (Host) GetJSONCategory() string {
	return ""
}

func (h Host) id() string {
	return h.ID
}

type RegistryAccount struct {
	ID              string           `json:"node_id" required:"true"`
	Name            string           `json:"name" required:"true"`
	ContainerImages []ContainerImage `json:"container_images" required:"true"`
	RegistryType    string           `json:"registry_type" required:"true"`
	Syncing         bool             `json:"syncing" required:"true"`
}

func (RegistryAccount) NodeType() string {
	return "RegistryAccount"
}

func (RegistryAccount) ExtendedField() string {
	return ""
}

func (RegistryAccount) GetCategory() string {
	return ""
}

func (RegistryAccount) GetJSONCategory() string {
	return ""
}

func (ra RegistryAccount) id() string {
	return ra.ID
}

type EndpointID struct {
	Endpoint string `json:"endpoint" required:"true"`
	Type     string `json:"type" required:"true"`
}

type Pod struct {
	ID                        string                 `json:"node_id" required:"true"`
	NodeName                  string                 `json:"node_name" required:"true"`
	Namespace                 string                 `json:"kubernetes_namespace" required:"true"`
	PodName                   string                 `json:"pod_name" required:"true"`
	Host                      string                 `json:"host_name" required:"true"`
	Containers                []Container            `json:"containers" required:"true"`
	Processes                 []Process              `json:"processes" required:"true"`
	KubernetesClusterName     string                 `json:"kubernetes_cluster_name" required:"true"`
	KubernetesClusterID       string                 `json:"kubernetes_cluster_id" required:"true"`
	KubernetesState           string                 `json:"kubernetes_state" required:"true"`
	KubernetesIP              string                 `json:"kubernetes_ip" required:"true"`
	KubernetesIsInHostNetwork bool                   `json:"kubernetes_is_in_host_network" required:"true"`
	KubernetesLabels          map[string]interface{} `json:"kubernetes_labels" required:"true" nested_json:"true"`
	KubernetesCreated         string                 `json:"kubernetes_created" required:"true"`
	MalwareScanStatus         string                 `json:"malware_scan_status" required:"true"`
	SecretScanStatus          string                 `json:"secret_scan_status" required:"true"`
	VulnerabilityScanStatus   string                 `json:"vulnerability_scan_status" required:"true"`
}

func (Pod) NodeType() string {
	return "Pod"
}

func (Pod) ExtendedField() string {
	return ""
}

func (Pod) GetCategory() string {
	return ""
}

func (Pod) GetJSONCategory() string {
	return ""
}

func (p Pod) id() string {
	return p.ID
}

type Container struct {
	ID                         string                 `json:"node_id" required:"true"`
	NodeName                   string                 `json:"node_name" required:"true"`
	Name                       string                 `json:"docker_container_name" required:"true"`
	ContainerImage             ContainerImage         `json:"image" required:"true"`
	Processes                  []Process              `json:"processes" required:"true"`
	DockerLabels               map[string]interface{} `json:"docker_labels" required:"true" nested_json:"true"`
	HostName                   string                 `json:"host_name" required:"true"`
	DockerContainerCommand     string                 `json:"docker_container_command" required:"true"`
	DockerContainerState       string                 `json:"docker_container_state" required:"true"`
	DockerContainerStateHuman  string                 `json:"docker_container_state_human" required:"true"`
	DockerContainerNetworkMode string                 `json:"docker_container_network_mode" required:"true"`
	DockerContainerNetworks    string                 `json:"docker_container_networks" required:"true"`
	DockerContainerIps         []interface{}          `json:"docker_container_ips" required:"true"`
	DockerContainerCreated     string                 `json:"docker_container_created" required:"true"`
	DockerContainerPorts       string                 `json:"docker_container_ports" required:"true"`
	Uptime                     int                    `json:"uptime" required:"true"`
	CPUMax                     float64                `json:"cpu_max" required:"true"`
	CPUUsage                   float64                `json:"cpu_usage" required:"true"`
	MemoryMax                  int64                  `json:"memory_max" required:"true"`
	MemoryUsage                int64                  `json:"memory_usage" required:"true"`
	VulnerabilitiesCount       int64                  `json:"vulnerabilities_count" required:"true"`
	VulnerabilityScanStatus    string                 `json:"vulnerability_scan_status" required:"true"`
	VulnerabilityLatestScanID  string                 `json:"vulnerability_latest_scan_id" required:"true"`
	SecretsCount               int64                  `json:"secrets_count" required:"true"`
	SecretScanStatus           string                 `json:"secret_scan_status" required:"true"`
	SecretLatestScanID         string                 `json:"secret_latest_scan_id" required:"true"`
	MalwaresCount              int64                  `json:"malwares_count" required:"true"`
	MalwareScanStatus          string                 `json:"malware_scan_status" required:"true"`
	MalwareLatestScanID        string                 `json:"malware_latest_scan_id" required:"true"`
}

func (Container) NodeType() string {
	return "Container"
}

func (Container) ExtendedField() string {
	return ""
}

func (Container) GetCategory() string {
	return ""
}

func (Container) GetJSONCategory() string {
	return ""
}

func (c Container) id() string {
	return c.ID
}

type Process struct {
	ID             string  `json:"node_id" required:"true"`
	Name           string  `json:"node_name" required:"true"`
	ShortNodeName  string  `json:"short_name" required:"true"`
	PID            int     `json:"pid" required:"true"`
	Command        string  `json:"cmdline" required:"true"`
	PPID           int     `json:"ppid" required:"true"`
	ThreadNumber   int     `json:"threads" required:"true"`
	CPUMax         float64 `json:"cpu_max" required:"true"`
	CPUUsage       float64 `json:"cpu_usage" required:"true"`
	MemoryMax      int64   `json:"memory_max" required:"true"`
	MemoryUsage    int64   `json:"memory_usage" required:"true"`
	OpenFilesCount int     `json:"open_files_count" required:"true"`
}

func (Process) NodeType() string {
	return "Process"
}

func (Process) ExtendedField() string {
	return ""
}

func (Process) GetCategory() string {
	return ""
}

func (Process) GetJSONCategory() string {
	return ""
}

func (p Process) id() string {
	return p.ID
}

type IngestedContainerImage struct {
	ID                     string                 `json:"node_id" required:"true"`
	NodeName               string                 `json:"node_name" required:"true"`
	Name                   string                 `json:"docker_image_name" required:"true"`
	Tag                    string                 `json:"docker_image_tag" required:"true"`
	Size                   string                 `json:"docker_image_size" required:"true"`
	DockerImageCreatedAt   string                 `json:"docker_image_created_at" required:"true"`
	DockerImageVirtualSize string                 `json:"docker_image_virtual_size" required:"true"`
	DockerImageID          string                 `json:"docker_image_id" required:"true"`
	ShortImageID           string                 `json:"short_image_id"`
	Metadata               map[string]interface{} `json:"metadata" nested_json:"true"`
}

func (IngestedContainerImage) NodeType() string {
	return "ContainerImage"
}

func (IngestedContainerImage) ExtendedField() string {
	return "docker_image_name"
}

func (IngestedContainerImage) GetCategory() string {
	return ""
}

func (IngestedContainerImage) GetJSONCategory() string {
	return ""
}

type ContainerImage struct {
	ID                        string                 `json:"node_id" required:"true"`
	ImageNodeID               string                 `json:"image_node_id" required:"true"`
	NodeName                  string                 `json:"node_name" required:"true"`
	Name                      string                 `json:"docker_image_name" required:"true"`
	Tag                       string                 `json:"docker_image_tag" required:"true"`
	Size                      string                 `json:"docker_image_size" required:"true"`
	DockerImageCreatedAt      string                 `json:"docker_image_created_at" required:"true"`
	DockerImageVirtualSize    string                 `json:"docker_image_virtual_size" required:"true"`
	DockerImageID             string                 `json:"docker_image_id" required:"true"`
	DockerImageTagList        []string               `json:"docker_image_tag_list" required:"true"`
	Metadata                  map[string]interface{} `json:"metadata" nested_json:"true"`
	VulnerabilitiesCount      int64                  `json:"vulnerabilities_count" required:"true"`
	VulnerabilityScanStatus   string                 `json:"vulnerability_scan_status" required:"true"`
	VulnerabilityLatestScanID string                 `json:"vulnerability_latest_scan_id" required:"true"`
	SecretsCount              int64                  `json:"secrets_count" required:"true"`
	SecretScanStatus          string                 `json:"secret_scan_status" required:"true"`
	SecretLatestScanID        string                 `json:"secret_latest_scan_id" required:"true"`
	MalwaresCount             int64                  `json:"malwares_count" required:"true"`
	MalwareScanStatus         string                 `json:"malware_scan_status" required:"true"`
	MalwareLatestScanID       string                 `json:"malware_latest_scan_id" required:"true"`
	Containers                []Container            `json:"containers" required:"true"`
}

func (ContainerImage) NodeType() string {
	return "ContainerImage"
}

func (ContainerImage) ExtendedField() string {
	return "image_node_id"
}

func (ContainerImage) GetCategory() string {
	return ""
}

func (ContainerImage) GetJSONCategory() string {
	return ""
}

func (ci ContainerImage) id() string {
	return ci.ID
}

type CloudResource struct {
	ID                          string `json:"node_id" required:"true"`
	Name                        string `json:"node_name" required:"true"`
	Type                        string `json:"node_type" required:"true"`
	TypeLabel                   string `json:"type_label" required:"true"`
	AccountID                   string `json:"account_id" required:"true"`
	CloudProvider               string `json:"cloud_provider" required:"true"`
	CloudRegion                 string `json:"cloud_region" required:"true"`
	CloudCompliancesCount       int64  `json:"cloud_compliances_count" required:"true"`
	CloudComplianceScanStatus   string `json:"cloud_compliance_scan_status" required:"true"`
	CloudComplianceLatestScanID string `json:"cloud_compliance_latest_scan_id" required:"true"`
}

func (CloudResource) NodeType() string {
	return "CloudResource"
}

func (CloudResource) GetCategory() string {
	return ""
}

func (CloudResource) GetJSONCategory() string {
	return ""
}

func (CloudResource) ExtendedField() string {
	return ""
}

func (cr CloudResource) id() string {
	return cr.ID
}

type CloudNode struct {
	ID                          string `json:"node_id" required:"true"`
	Name                        string `json:"node_name" required:"true"`
	CloudProvider               string `json:"cloud_provider" required:"true"`
	CloudCompliancesCount       int64  `json:"cloud_compliances_count" required:"true"`
	CloudComplianceScanStatus   string `json:"cloud_compliance_scan_status" required:"true"`
	CloudComplianceLatestScanID string `json:"cloud_compliance_latest_scan_id" required:"true"`
}

func (CloudNode) NodeType() string {
	return "CloudNode"
}

func (CloudNode) GetCategory() string {
	return ""
}

func (CloudNode) GetJSONCategory() string {
	return ""
}

func (CloudNode) ExtendedField() string {
	return ""
}

func (cr CloudNode) id() string {
	return cr.ID
}
