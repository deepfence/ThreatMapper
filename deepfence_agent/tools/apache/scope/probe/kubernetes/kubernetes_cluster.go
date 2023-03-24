package kubernetes

import (
	"time"

	"github.com/deepfence/df-utils/cloud_metadata"
	"github.com/weaveworks/scope/report"
)

// KubernetesClusterResource represents a Kubernetes cluster
type KubernetesClusterResource interface {
	GetNode() (report.Metadata, report.Parent)
}

type kubernetesCluster struct {
	cloudProvider string
}

// NewKubernetesClusterResource creates a new Cluster node
func NewKubernetesClusterResource() KubernetesClusterResource {
	return &kubernetesCluster{cloudProvider: cloud_metadata.DetectCloudServiceProvider()}
}

func (k *kubernetesCluster) GetNode() (report.Metadata, report.Parent) {
	node := report.Metadata{
		Timestamp:             time.Now().UTC().Format(time.RFC3339Nano),
		NodeID:                kubernetesClusterId,
		NodeName:              kubernetesClusterName,
		NodeType:              report.KubernetesCluster,
		KubernetesClusterId:   kubernetesClusterId,
		KubernetesClusterName: kubernetesClusterName,
	}
	parent := report.Parent{
		CloudProvider: k.cloudProvider,
	}
	return node, parent
}
