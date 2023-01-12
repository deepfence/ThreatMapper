package model

type PresentationContext struct {
	MetadataOrder map[string]int    `json:"metadata_order" required:"true"`
	IDToLabels    map[string]string `json:"id_to_labels" required:"true"`
}

type Metadata map[string]interface{}

type Host struct {
	ID         string         `json:"node_id" required:"true"`
	Name       string         `json:"host_name" required:"true"`
	Containers []Container    `json:"containers" required:"true"`
	Processes  []Process      `json:"processes" required:"true"`
	Pods       []Pod          `json:"pods" required:"true"`
	Metadata   Metadata       `json:"cloud_metadata" required:"true" nested_json:"true"`
	Metrics    ComputeMetrics `json:"metrics" required:"true"`
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
	Image      string         `json:"image" required:"true"`
	Metrics    ComputeMetrics `json:"metrics" required:"true"`
	Containers []Container    `json:"containers" required:"true"`
	Processes  []Process      `json:"processes" required:"true" required:"true"`
	Metadata   Metadata       `json:"metadata" required:"true" nested_json:"true"`
}

type Container struct {
	ID           string         `json:"node_id" required:"true"`
	Name         string         `json:"name" required:"true"`
	Image        Image          `json:"image" required:"true"`
	Processes    []Process      `json:"processes" required:"true"`
	Metrics      ComputeMetrics `json:"metrics" required:"true"`
	Metadata     Metadata       `json:"metadata" required:"true" nested_json:"true"`
	DockerLabels Metadata       `json:"docker_labels" required:"true" nested_json:"true"`
	HostName     string         `json:"host_name" required:"true"`
}

type Process struct {
	ID           string         `json:"node_id" required:"true"`
	Name         string         `json:"name" required:"true"`
	PID          string         `json:"pid" required:"true"`
	Command      string         `json:"command" required:"true"`
	PPID         string         `json:"ppid" required:"true"`
	ThreadNumber int            `json:"thread_number" required:"true"`
	Metrics      ComputeMetrics `json:"metrics" required:"true"`
	Metadata     Metadata       `json:"metadata" required:"true" nested_json:"true"`
}

type Image struct {
	ID        string         `json:"id" required:"true"`
	Name      string         `json:"name" required:"true"`
	Tag       string         `json:"tag" required:"true"`
	SizeMB    string         `json:"size_mb" required:"true"`
	VirtualMB string         `json:"virtual_mb" required:"true"`
	Metrics   ComputeMetrics `json:"metrics" required:"true"`
	Metadata  Metadata       `json:"metadata" required:"true" nested_json:"true"`
}

type ComputeMetrics struct {
	CPUPercent float32 `json:"cpu_percent" required:"true"`
	MemoryMB   float32 `json:"memory_mb" required:"true"`
}
