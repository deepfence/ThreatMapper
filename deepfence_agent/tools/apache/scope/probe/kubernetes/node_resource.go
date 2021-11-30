package kubernetes

import (
	apiv1 "k8s.io/api/core/v1"
)

// NodeResource represents a Kubernetes node
type NodeResource interface {
	Meta
}

type nodeResource struct {
	*apiv1.Node
	Meta
}

// NewNamespace creates a new Namespace
func NewNodeResource(n *apiv1.Node) NodeResource {
	return &nodeResource{
		Node: n,
		Meta: meta{n.ObjectMeta},
	}
}