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
	ID    string `json:"node_id" required:"true"`
	Name  string `json:"node_name" required:"true"`
	Hosts []Host `json:"hosts" required:"true"`
}

func (KubernetesCluster) NodeType() string {
	return "KubernetesCluster"
}

func (KubernetesCluster) GetCategory() string {
	return ""
}

func (KubernetesCluster) GetJsonCategory() string {
	return ""
}

func (KubernetesCluster) ExtendedField() string {
	return ""
}

func (kc KubernetesCluster) id() string {
	return kc.ID
}

type RegularScanStatus struct {
	VulnerabilitiesCount        int64  `json:"vulnerabilities_count" required:"true"`
	VulnerabilityScanStatus     string `json:"vulnerability_scan_status" required:"true"`
	VulnerabilityLatestScanId   string `json:"vulnerability_latest_scan_id" required:"true"`
	SecretsCount                int64  `json:"secrets_count" required:"true"`
	SecretScanStatus            string `json:"secret_scan_status" required:"true"`
	SecretLatestScanId          string `json:"secret_latest_scan_id" required:"true"`
	MalwaresCount               int64  `json:"malwares_count" required:"true"`
	MalwareScanStatus           string `json:"malware_scan_status" required:"true"`
	MalwareLatestScanId         string `json:"malware_latest_scan_id" required:"true"`
	CompliancesCount            int64  `json:"compliances_count" required:"true"`
	ComplianceScanStatus        string `json:"compliance_scan_status" required:"true"`
	ComplianceLatestScanId      string `json:"compliance_latest_scan_id" required:"true"`
	CloudCompliancesCount       int64  `json:"cloud_compliances_count" required:"true"`
	CloudComplianceScanStatus   string `json:"cloud_compliance_scan_status" required:"true"`
	CloudComplianceLatestScanId string `json:"cloud_compliance_latest_scan_id" required:"true"`
}

type BasicNode struct {
	NodeId   string `json:"node_id" required:"true"`
	Name     string `json:"name" required:"true"`
	NodeType string `json:"node_type" required:"true"`
	HostName string `json:"host_name" required:"true"`
}

type Host struct {
	ID                        string           `json:"node_id" required:"true"`
	HostName                  string           `json:"host_name" required:"true"`
	NodeName                  string           `json:"node_name" required:"true"`
	Containers                []Container      `json:"containers" required:"true"`
	Processes                 []Process        `json:"processes" required:"true"`
	Pods                      []Pod            `json:"pods" required:"true"`
	ContainerImages           []ContainerImage `json:"container_images" required:"true"`
	InterfaceNames            []string         `json:"interface_names" required:"true"`
	InterfaceIps              []string         `json:"interface_ips" required:"true"`
	KernelVersion             string           `json:"kernel_version" required:"true"`
	Uptime                    int              `json:"uptime" required:"true"`
	Version                   string           `json:"version" required:"true"`
	AgentRunning              bool             `json:"agent_running" required:"true"`
	IsConsoleVm               bool             `json:"is_console_vm" required:"true"`
	LocalCIDRs                []string         `json:"local_cidr" required:"true"`
	Os                        string           `json:"os" required:"true"`
	LocalNetworks             []string         `json:"local_networks,omitempty"`
	InstanceID                string           `json:"instance_id,omitempty"`
	CloudProvider             string           `json:"cloud_provider" required:"true"`
	InstanceType              string           `json:"instance_type,omitempty"`
	PublicIP                  []string         `json:"public_ip,omitempty"`
	PrivateIP                 []string         `json:"private_ip,omitempty"`
	AvailabilityZone          string           `json:"availability_zone,omitempty"`
	KernelId                  string           `json:"kernel_id,omitempty"`
	CloudRegion               string           `json:"cloud_region" required:"true"`
	ResourceGroup             string           `json:"resource_group,omitempty"`
	CpuMax                    float64          `json:"cpu_max,omitempty"`
	CpuUsage                  float64          `json:"cpu_usage,omitempty"`
	MemoryMax                 int64            `json:"memory_max,omitempty"`
	MemoryUsage               int64            `json:"memory_usage,omitempty"`
	VulnerabilitiesCount      int64            `json:"vulnerabilities_count"`
	VulnerabilityScanStatus   string           `json:"vulnerability_scan_status"`
	VulnerabilityLatestScanId string           `json:"vulnerability_latest_scan_id"`
	SecretsCount              int64            `json:"secrets_count"`
	SecretScanStatus          string           `json:"secret_scan_status"`
	SecretLatestScanId        string           `json:"secret_latest_scan_id"`
	MalwaresCount             int64            `json:"malwares_count"`
	MalwareScanStatus         string           `json:"malware_scan_status"`
	MalwareLatestScanId       string           `json:"malware_latest_scan_id"`
	CompliancesCount          int64            `json:"compliances_count"`
	ComplianceScanStatus      string           `json:"compliance_scan_status"`
	ComplianceLatestScanId    string           `json:"compliance_latest_scan_id"`
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

func (Host) GetJsonCategory() string {
	return ""
}

func (h Host) id() string {
	return h.ID
}

type RegistryAccount struct {
	ID              string           `json:"node_id" required:"true"`
	Name            string           `json:"host_name" required:"true"`
	ContainerImages []ContainerImage `json:"container_images" required:"true"`
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

func (RegistryAccount) GetJsonCategory() string {
	return ""
}

func (ra RegistryAccount) id() string {
	return ra.ID
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
	ID                        string      `json:"node_id" required:"true"`
	NodeName                  string      `json:"node_name" required:"true"`
	Namespace                 string      `json:"kubernetes_namespace" required:"true"`
	Host                      string      `json:"host_name" required:"true"`
	Containers                []Container `json:"containers" required:"true"`
	Processes                 []Process   `json:"processes" required:"true"`
	KubernetesClusterName     string      `json:"kubernetes_cluster_name" required:"true"`
	KubernetesClusterId       string      `json:"kubernetes_cluster_id" required:"true"`
	KubernetesState           string      `json:"kubernetes_state"`
	KubernetesIP              string      `json:"kubernetes_ip"`
	KubernetesIsInHostNetwork string      `json:"kubernetes_is_in_host_network"`
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

func (Pod) GetJsonCategory() string {
	return ""
}

func (p Pod) id() string {
	return p.ID
}

type Container struct {
	ID                         string         `json:"node_id" required:"true"`
	NodeName                   string         `json:"node_name" required:"true"`
	Name                       string         `json:"docker_container_name" required:"true"`
	ContainerImage             ContainerImage `json:"image" required:"true"`
	Processes                  []Process      `json:"processes" required:"true"`
	DockerLabels               Metadata       `json:"docker_labels" required:"true" nested_json:"true"`
	HostName                   string         `json:"host_name" required:"true"`
	DockerContainerCommand     string         `json:"docker_container_command,omitempty"`
	DockerContainerState       string         `json:"docker_container_state,omitempty"`
	DockerContainerStateHuman  string         `json:"docker_container_state_human,omitempty"`
	DockerContainerNetworkMode string         `json:"docker_container_network_mode,omitempty"`
	DockerContainerNetworks    string         `json:"docker_container_networks,omitempty"`
	DockerContainerIps         []string       `json:"docker_container_ips,omitempty"`
	DockerContainerCreated     string         `json:"docker_container_created,omitempty"`
	DockerContainerPorts       string         `json:"docker_container_ports,omitempty"`
	Uptime                     int            `json:"uptime" required:"true"`
	CpuMax                     float64        `json:"cpu_max,omitempty"`
	CpuUsage                   float64        `json:"cpu_usage,omitempty"`
	MemoryMax                  int64          `json:"memory_max,omitempty"`
	MemoryUsage                int64          `json:"memory_usage,omitempty"`
	VulnerabilitiesCount       int64          `json:"vulnerabilities_count"`
	VulnerabilityScanStatus    string         `json:"vulnerability_scan_status"`
	VulnerabilityLatestScanId  string         `json:"vulnerability_latest_scan_id"`
	SecretsCount               int64          `json:"secrets_count"`
	SecretScanStatus           string         `json:"secret_scan_status"`
	SecretLatestScanId         string         `json:"secret_latest_scan_id"`
	MalwaresCount              int64          `json:"malwares_count"`
	MalwareScanStatus          string         `json:"malware_scan_status"`
	MalwareLatestScanId        string         `json:"malware_latest_scan_id"`
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

func (Container) GetJsonCategory() string {
	return ""
}

func (c Container) id() string {
	return c.ID
}

type Process struct {
	ID             string  `json:"node_id" required:"true"`
	Name           string  `json:"node_name" required:"true"`
	PID            int     `json:"pid" required:"true"`
	Command        string  `json:"cmdline" required:"true"`
	PPID           int     `json:"ppid" required:"true"`
	ThreadNumber   int     `json:"threads" required:"true"`
	CpuMax         float64 `json:"cpu_max,omitempty"`
	CpuUsage       float64 `json:"cpu_usage,omitempty"`
	MemoryMax      int64   `json:"memory_max,omitempty"`
	MemoryUsage    int64   `json:"memory_usage,omitempty"`
	OpenFilesCount int     `json:"open_files_count,omitempty"`
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

func (Process) GetJsonCategory() string {
	return ""
}

func (p Process) id() string {
	return p.ID
}

type ContainerImage struct {
	ID                        string   `json:"node_id" required:"true"`
	NodeName                  string   `json:"node_name" required:"true"`
	Name                      string   `json:"docker_image_name" required:"true"`
	Tag                       string   `json:"docker_image_tag" required:"true"`
	Size                      string   `json:"docker_image_size" required:"true"`
	DockerImageCreatedAt      string   `json:"docker_image_created_at,omitempty"`
	DockerImageVirtualSize    string   `json:"docker_image_virtual_size,omitempty"`
	DockerImageID             string   `json:"docker_image_id,omitempty"`
	Metadata                  Metadata `json:"metadata" required:"true" nested_json:"true"`
	VulnerabilitiesCount      int64    `json:"vulnerabilities_count"`
	VulnerabilityScanStatus   string   `json:"vulnerability_scan_status"`
	VulnerabilityLatestScanId string   `json:"vulnerability_latest_scan_id"`
	SecretsCount              int64    `json:"secrets_count"`
	SecretScanStatus          string   `json:"secret_scan_status"`
	SecretLatestScanId        string   `json:"secret_latest_scan_id"`
	MalwaresCount             int64    `json:"malwares_count"`
	MalwareScanStatus         string   `json:"malware_scan_status"`
	MalwareLatestScanId       string   `json:"malware_latest_scan_id"`
}

func (ContainerImage) NodeType() string {
	return "ContainerImage"
}

func (ContainerImage) ExtendedField() string {
	return ""
}

func (ContainerImage) GetCategory() string {
	return ""
}

func (ContainerImage) GetJsonCategory() string {
	return ""
}

func (ci ContainerImage) id() string {
	return ci.ID
}

type CloudResource struct {
	ID                          string `json:"node_id" required:"true"`
	Name                        string `json:"node_name" required:"true"`
	Type                        string `json:"node_type" required:"true"`
	CloudCompliancesCount       int64  `json:"cloud_compliances_count" required:"true"`
	CloudComplianceScanStatus   string `json:"cloud_compliance_scan_status" required:"true"`
	CloudComplianceLatestScanId string `json:"cloud_compliance_latest_scan_id" required:"true"`
}

func (CloudResource) NodeType() string {
	return "CloudResource"
}

func (CloudResource) GetCategory() string {
	return ""
}

func (CloudResource) GetJsonCategory() string {
	return ""
}

func (CloudResource) ExtendedField() string {
	return ""
}

func (cr CloudResource) id() string {
	return cr.ID
}

func ExtractNodeIDs[T Identifiable](entries []T) []string {
	res := []string{}
	for i := range entries {
		res = append(res, entries[i].id())
	}
	return res
}
