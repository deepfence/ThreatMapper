package utils

type SbomQueryParameters struct {
	ImageName             string `schema:"image_name" json:"image_name"`
	ImageId               string `schema:"image_id" json:"image_id"`
	ScanId                string `schema:"scan_id" json:"scan_id"`
	KubernetesClusterName string `schema:"kubernetes_cluster_name" json:"kubernetes_cluster_name"`
	HostName              string `schema:"host_name" json:"host_name"`
	NodeId                string `schema:"node_id" json:"node_id"`
	NodeType              string `schema:"node_type" json:"node_type"`
	ScanType              string `schema:"scan_type" json:"scan_type"`
	ContainerName         string `schema:"container_name" json:"container_name"`
	SBOMFilePath          string `schema:"-" json:"sbom_file_path"`
	Bucket                string `schema:"-" json:"bucket"`
}
