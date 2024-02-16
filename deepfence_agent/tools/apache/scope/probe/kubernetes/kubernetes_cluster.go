package kubernetes

import (
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/df-utils/cloud_metadata"
	"github.com/weaveworks/scope/report"
)

// KubernetesClusterResource represents a Kubernetes cluster
type KubernetesClusterResource interface {
	GetNode() report.TopologyNode
	GetTopology() report.Topology
	Stop()
}

type kubernetesCluster struct {
	k8sTopology report.Topology
	stopRefresh chan bool
	sync.RWMutex
}

// NewKubernetesClusterResource creates a new Cluster node
func NewKubernetesClusterResource() KubernetesClusterResource {
	k8sCluster := kubernetesCluster{stopRefresh: make(chan bool)}
	k8sCluster.cacheK8sTopology()
	go k8sCluster.refresh()
	return &k8sCluster
}

func (k *kubernetesCluster) Stop() {
	k.stopRefresh <- true
}

func (k *kubernetesCluster) refresh() {
	ticker := time.NewTicker(6 * time.Hour)
	for {
		select {
		case <-ticker.C:
			k.cacheK8sTopology()
		case <-k.stopRefresh:
			return
		}
	}
}

func (k *kubernetesCluster) cacheK8sTopology() {
	k.Lock()
	defer k.Unlock()

	k.k8sTopology = report.MakeTopology()
	node := k.GetNode()
	//cloudProviderNodeId = node.Parents.CloudProvider
	k.k8sTopology.AddNode(node)
}

func (k *kubernetesCluster) GetTopology() report.Topology {
	k.RLock()
	defer k.RUnlock()

	return k.k8sTopology
}

func (k *kubernetesCluster) GetNode() report.TopologyNode {
	cloudMetadata := cloud_metadata.GetCloudMetadata()
	log.Info().Msgf("Cloud metadata: %v", cloudMetadata)

	metadata := report.Metadata{
		Timestamp:             time.Now().UTC().Format(time.RFC3339Nano),
		NodeID:                kubernetesClusterId,
		NodeName:              kubernetesClusterName,
		NodeType:              report.KubernetesCluster,
		KubernetesClusterId:   kubernetesClusterId,
		KubernetesClusterName: kubernetesClusterName,
		CloudProvider:         cloudMetadata.CloudProvider,
		AgentRunning:          true,
		CloudAccountID:        cloudMetadata.AccountID,
	}
	return report.TopologyNode{
		Metadata: metadata,
		Parents: &report.Parent{
			CloudProvider: cloudMetadata.CloudProvider,
		},
	}
}
