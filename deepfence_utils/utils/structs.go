package utils

type SbomRequest struct {
	SbomParameters
	SbomBody
}

type SbomParameters struct {
	ImageName             string `json:"image_name,omitempty"`
	ImageId               string `json:"image_id,omitempty"`
	ScanId                string `json:"scan_id,omitempty"`
	KubernetesClusterName string `json:"kubernetes_cluster_name,omitempty"`
	HostName              string `json:"host_name,omitempty"`
	NodeId                string `json:"node_id,omitempty"`
	NodeType              string `json:"node_type,omitempty"`
	ScanType              string `json:"scan_type,omitempty"`
	ContainerName         string `json:"container_name,omitempty"`
	SBOMFilePath          string `json:"sbom_file_path,omitempty"`
	Mode                  string `json:"mode,omitempty"`
}

type SbomBody struct {
	SBOM []byte `json:"sbom,omitempty"`
}
