package report

import (
	"reflect"
)

type MetadataRow struct {
	ID       string      `json:"id"`
	Label    string      `json:"label"`
	Value    interface{} `json:"value"`
	Priority float64     `json:"priority,omitempty"`
	Datatype string      `json:"dataType,omitempty"`
	Truncate int         `json:"truncate,omitempty"`
}

type Topology map[string]Metadata

func MakeTopology() Topology {
	return map[string]Metadata{}
}

func (t Topology) ReplaceNode(node Metadata) {
	t[node.NodeID] = node
}

func (t Topology) AddNode(node Metadata) {
	t[node.NodeID] = node
}

func (t Topology) Merge(o Topology) {
	for k, v := range o {
		t[k] = v
	}
}

func (t Topology) Copy() Topology {
	newTopology := make(Topology)
	for k, v := range t {
		newTopology[k] = v
	}
	return newTopology
}

func (t Topology) UnsafeUnMerge(o Topology) {

}

func (t Topology) UnsafeMerge(o Topology) {
	for k, v := range o {
		t[k] = v
	}
}

func MakeMetadata() Metadata {
	return Metadata{}
}

func (m Metadata) EqualIgnoringTimestamps(n Metadata) bool {
	return reflect.DeepEqual(m, n)
}

func (m Metadata) Copy() Metadata {
	return m
}

func (m Metadata) WithID(id string) Metadata {
	m.NodeID = id
	return m
}

type Metadata struct {
	NodeID    string `json:"node_id"`
	NodeType  string `json:"node_type"`
	NodeName  string `json:"node_name"`
	Timestamp string `json:"timestamp"`

	// cloud metadata
	InstanceID       string   `json:"instance_id,omitempty"`
	CloudProvider    string   `json:"cloud_provider,omitempty"`
	InstanceType     string   `json:"instance_type,omitempty"`
	PublicIP         []string `json:"public_ip,omitempty"`
	PrivateIP        []string `json:"private_ip,omitempty"`
	AvailabilityZone string   `json:"availability_zone,omitempty"`
	KernelId         string   `json:"kernel_id,omitempty"`
	CloudRegion      string   `json:"cloud_region,omitempty"`
	ResourceGroup    string   `json:"resource_group,omitempty"`

	// common
	Uptime          int      `json:"uptime,omitempty"`
	Pseudo          bool     `json:"pseudo"`
	UserDefinedTags []string `json:"user_defined_tags,omitempty"`
	CpuMax          float64  `json:"cpu_max,omitempty"`
	CpuUsage        float64  `json:"cpu_usage,omitempty"`
	MemoryMax       int64    `json:"memory_max,omitempty"`
	MemoryUsage     int64    `json:"memory_usage,omitempty"`
	OpenFilesCount  int      `json:"open_files_count,omitempty"`

	// host
	Version        string   `json:"version,omitempty"`
	AgentRunning   bool     `json:"agent_running,omitempty"`
	KernelVersion  string   `json:"kernel_version,omitempty"`
	HostName       string   `json:"host_name,omitempty"`
	Os             string   `json:"os,omitempty"`
	LocalNetworks  []string `json:"local_networks,omitempty"`
	InterfaceNames []string `json:"interface_names,omitempty"`
	InterfaceIps   []string `json:"interface_ips,omitempty"`
	InterfaceIpMap string   `json:"interface_ip_map,omitempty"`
	IsConsoleVm    bool     `json:"is_console_vm,omitempty"`
	LocalCIDRs     []string `json:"local_cidr,omitempty"`

	// docker
	DockerContainerName        string   `json:"docker_container_name,omitempty"`
	DockerContainerCommand     string   `json:"docker_container_command,omitempty"`
	DockerContainerState       string   `json:"docker_container_state,omitempty"`
	DockerContainerStateHuman  string   `json:"docker_container_state_human,omitempty"`
	DockerContainerNetworkMode string   `json:"docker_container_network_mode,omitempty"`
	DockerContainerNetworks    string   `json:"docker_container_networks,omitempty"`
	DockerContainerIps         []string `json:"docker_container_ips,omitempty"`
	DockerContainerCreated     string   `json:"docker_container_created,omitempty"`
	DockerContainerPorts       string   `json:"docker_container_ports,omitempty"`
	DockerLabels               string   `json:"docker_label,omitempty"`
	DockerEnv                  string   `json:"docker_env,omitempty"`

	ImageName              string `json:"docker_image_name,omitempty"`
	ImageNameWithTag       string `json:"docker_image_name_with_tag,omitempty"`
	ImageTag               string `json:"docker_image_tag,omitempty"`
	DockerImageSize        string `json:"docker_image_size,omitempty"`
	DockerImageCreatedAt   string `json:"docker_image_created_at,omitempty"`
	DockerImageVirtualSize string `json:"docker_image_virtual_size,omitempty"`
	DockerImageID          string `json:"docker_image_id,omitempty"`
	DockerImageLabels      string `json:"docker_image_labels,omitempty"`

	// process
	Pid       int      `json:"pid,omitempty"`
	Cmdline   string   `json:"cmdline,omitempty"`
	Ppid      int      `json:"ppid,omitempty"`
	Threads   int      `json:"threads,omitempty"`
	OpenFiles []string `json:"open_files,omitempty"`

	// endpoint
	ConnectionCount int    `json:"connection_count,omitempty"`
	CopyOf          string `json:"copy_of,omitempty"`

	// kubernetes
	PodName                   string   `json:"pod_name,omitempty"`
	KubernetesLabels          string   `json:"kubernetes_labels,omitempty"`
	KubernetesState           string   `json:"kubernetes_state,omitempty"`
	KubernetesIP              string   `json:"kubernetes_ip,omitempty"`
	KubernetesPublicIP        string   `json:"kubernetes_public_ip,omitempty"`
	KubernetesIngressIP       []string `json:"kubernetes_ingress_ip,omitempty"`
	KubernetesNamespace       string   `json:"kubernetes_namespace,omitempty"`
	KubernetesCreated         string   `json:"kubernetes_created,omitempty"`
	KubernetesIsInHostNetwork bool     `json:"kubernetes_is_in_host_network,omitempty"`
	KubernetesType            string   `json:"kubernetes_type,omitempty"`
	KubernetesPorts           []int32  `json:"kubernetes_ports,omitempty"`
	KubernetesClusterId       string   `json:"kubernetes_cluster_id,omitempty"`
	KubernetesClusterName     string   `json:"kubernetes_cluster_name"`
}

func (m Metadata) Merge(n Metadata) Metadata {
	return n
}
