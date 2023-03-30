package kubernetes

import (
	"encoding/json"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/weaveworks/scope/report"
)

// Meta represents a metadata information about a Kubernetes object
type Meta interface {
	UID() string
	Name() string
	Namespace() string
	Created() string
	Labels() map[string]string
	MetaNode(id string, nodeType string) report.Metadata
}

type meta struct {
	ObjectMeta metav1.ObjectMeta
}

func (m meta) UID() string {
	return string(m.ObjectMeta.UID)
}

func (m meta) Name() string {
	return m.ObjectMeta.Name
}

func (m meta) Namespace() string {
	return m.ObjectMeta.Namespace
}

func (m meta) Created() string {
	return m.ObjectMeta.CreationTimestamp.Format(time.RFC3339Nano)
}

func (m meta) Labels() map[string]string {
	return m.ObjectMeta.Labels
}

// MetaNode gets the node metadata
func (m meta) MetaNode(id string, nodeType string) report.Metadata {
	var labels string
	labelsJson, err := json.Marshal(m.Labels())
	if err == nil {
		labels = string(labelsJson)
	}
	return report.Metadata{
		NodeID:              id,
		NodeName:            m.Name(),
		NodeType:            nodeType,
		KubernetesLabels:    labels,
		KubernetesCreated:   m.Created(),
		KubernetesNamespace: m.Namespace(),
	}
}

type namespaceMeta struct {
	ObjectMeta metav1.ObjectMeta
}

func (m namespaceMeta) UID() string {
	return string(m.ObjectMeta.UID)
}

func (m namespaceMeta) Name() string {
	return m.ObjectMeta.Name
}

func (m namespaceMeta) Namespace() string {
	return m.ObjectMeta.Namespace
}

func (m namespaceMeta) Created() string {
	return m.ObjectMeta.CreationTimestamp.Format(time.RFC3339Nano)
}

func (m namespaceMeta) Labels() map[string]string {
	return m.ObjectMeta.Labels
}

// MetaNode gets the node metadata
// For namespaces, ObjectMeta.Namespace is not set
func (m namespaceMeta) MetaNode(id string, nodeType string) report.Metadata {
	var labels string
	labelsJson, err := json.Marshal(m.Labels())
	if err == nil {
		labels = string(labelsJson)
	}
	return report.Metadata{
		Timestamp:         time.Now().UTC().Format(time.RFC3339Nano),
		NodeID:            id,
		NodeType:          nodeType,
		NodeName:          m.Name() + " / " + kubernetesClusterName,
		KubernetesLabels:  labels,
		KubernetesCreated: m.Created(),
	}
}
