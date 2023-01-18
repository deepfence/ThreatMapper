package model

type Cypherable interface {
	NodeType() string
}

type PresentationContext struct {
	MetadataOrder map[string]int    `json:"metadata_order" required:"true"`
	IDToLabels    map[string]string `json:"id_to_labels" required:"true"`
}

type Metadata map[string]interface{}

type Host struct {
	ID              string           `json:"node_id" required:"true"`
	Name            string           `json:"host_name" required:"true"`
	Containers      []Container      `json:"containers" required:"true"`
	Processes       []Process        `json:"processes" required:"true"`
	Pods            []Pod            `json:"pods" required:"true"`
	ContainerImages []ContainerImage `json:"container_images" required:"true"`
	Metadata        Metadata         `json:"cloud_metadata" required:"true" nested_json:"true"`
	Metrics         ComputeMetrics   `json:"metrics" required:"true"`
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
	Name       string         `json:"name" required:"true"`
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
	Name           string         `json:"name" required:"true"`
	ContainerImage ContainerImage `json:"image" required:"true"`
	Processes      []Process      `json:"processes" required:"true"`
	Metrics        ComputeMetrics `json:"metrics" required:"true"`
	Metadata       Metadata       `json:"metadata" required:"true" nested_json:"true"`
	DockerLabels   Metadata       `json:"docker_labels" required:"true" nested_json:"true"`
	HostName       string         `json:"host_name" required:"true"`
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
}

func (ContainerImage) NodeType() string {
	return "ContainerImage"
}

type ComputeMetrics struct {
	CPUPercent float32 `json:"cpu_percent" required:"true"`
	MemoryMB   float32 `json:"memory_mb" required:"true"`
}
