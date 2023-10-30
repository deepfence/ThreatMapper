package podman

import (
	"time"
)

type Container struct {
	AutoRemove bool              `json:"AutoRemove"`
	Command    []string          `json:"Command"`
	Created    time.Time         `json:"Created"`
	CreatedAt  string            `json:"CreatedAt"`
	Exited     bool              `json:"Exited"`
	ExitedAt   int64             `json:"ExitedAt"`
	ExitCode   int               `json:"ExitCode"`
	ID         string            `json:"Id"`
	Image      string            `json:"Image"`
	ImageID    string            `json:"ImageID"`
	IsInfra    bool              `json:"IsInfra"`
	Labels     map[string]string `json:"Labels"`
	Mounts     []string          `json:"Mounts"`
	Names      []string          `json:"Names"`
	Namespaces struct{}          `json:"Namespaces"`
	Networks   []string          `json:"Networks"`
	Pid        int               `json:"Pid"`
	Pod        string            `json:"Pod"`
	PodName    string            `json:"PodName"`
	Ports      []struct {
		HostIP        string `json:"host_ip"`
		ContainerPort int    `json:"container_port"`
		HostPort      int    `json:"host_port"`
		Range         int    `json:"range"`
		Protocol      string `json:"protocol"`
	} `json:"Ports"`
	Size      any    `json:"Size"`
	StartedAt int    `json:"StartedAt"`
	State     string `json:"State"`
	Status    string `json:"Status"`
}

type ContainerImage struct {
	ID          string            `json:"Id"`
	ParentID    string            `json:"ParentId"`
	RepoTags    []string          `json:"RepoTags"`
	RepoDigests []string          `json:"RepoDigests"`
	Created     int               `json:"Created"`
	Size        int               `json:"Size"`
	SharedSize  int               `json:"SharedSize"`
	VirtualSize int               `json:"VirtualSize"`
	Labels      map[string]string `json:"Labels"`
	Containers  int               `json:"Containers"`
	Names       []string          `json:"Names"`
	Digest      string            `json:"Digest"`
	History     []string          `json:"History"`
}
