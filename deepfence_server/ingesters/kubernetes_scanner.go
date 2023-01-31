package ingesters

type RegisterKubernetesScannerRequest struct {
	NodeID                string `json:"node_id"`
	KubernetesClusterName string `json:"kubernetes_cluster_name"`
}
