package kubernetes

import (
	"time"

	"github.com/deepfence/df-utils/cloud_metadata"
	"github.com/weaveworks/scope/report"
)

// KubernetesClusterResource represents a Kubernetes cluster
type KubernetesClusterResource interface {
	GetNode() report.TopologyNode
}

type kubernetesCluster struct {
	cloudProvider  string
	cloudAccountID string
}

// NewKubernetesClusterResource creates a new Cluster node
func NewKubernetesClusterResource() KubernetesClusterResource {
	metadata := cloud_metadata.GetCloudMetadata()
	return &kubernetesCluster{cloudProvider: metadata.CloudProvider, cloudAccountID: metadata.AccountID}
}

func (k *kubernetesCluster) GetNode() report.TopologyNode {
	metadata := report.Metadata{
		Timestamp:             time.Now().UTC().Format(time.RFC3339Nano),
		NodeID:                kubernetesClusterId,
		NodeName:              kubernetesClusterName,
		NodeType:              report.KubernetesCluster,
		KubernetesClusterId:   kubernetesClusterId,
		KubernetesClusterName: kubernetesClusterName,
		CloudProvider:         k.cloudProvider,
		AgentRunning:          true,
		CloudAccountID:        k.cloudAccountID,
	}
	return report.TopologyNode{
		Metadata: metadata,
		Parents: &report.Parent{
			CloudProvider: k.cloudProvider,
		},
	}
}
