package kubernetes

import (
	"github.com/deepfence/df-utils/cloud_metadata"
	"github.com/weaveworks/scope/report"
)

// KubernetesClusterResource represents a Kubernetes cluster
type KubernetesClusterResource interface {
	GetNode() report.Node
}

type kubernetesCluster struct {
	cloudProvider string
}

// NewKubernetesClusterResource creates a new Cluster node
func NewKubernetesClusterResource() KubernetesClusterResource {
	return &kubernetesCluster{cloudProvider: cloud_metadata.DetectCloudServiceProvider()}
}

func (k *kubernetesCluster) GetNode() report.Node {
	cloudProviderId := report.MakeCloudProviderNodeID(k.cloudProvider)
	return report.MakeNodeWith(report.MakeKubernetesClusterNodeID(kubernetesClusterId), map[string]string{
		k8sClusterName:       kubernetesClusterName,
		report.CloudProvider: k.cloudProvider,
	}).WithTopology(report.KubernetesCluster).WithParent(report.CloudProvider, cloudProviderId)
}
