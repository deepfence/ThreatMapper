package kubernetes

import (
	"fmt"
	"time"

	"github.com/weaveworks/scope/report"

	apiv1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
)

// Service represents a Kubernetes service
type Service interface {
	Meta
	GetNode() (report.Metadata, report.Parent)
	Selector() labels.Selector
	ClusterIP() string
	LoadBalancerIP() string
}

type service struct {
	*apiv1.Service
	Meta
}

// NewService creates a new Service
func NewService(s *apiv1.Service) Service {
	return &service{Service: s, Meta: meta{s.ObjectMeta}}
}

func (s *service) Selector() labels.Selector {
	if s.Spec.Selector == nil {
		return labels.Nothing()
	}
	return labels.SelectorFromSet(labels.Set(s.Spec.Selector))
}

// human-readable version of a Kubernetes ServicePort
func servicePortString(p apiv1.ServicePort) string {
	if p.NodePort == 0 {
		return fmt.Sprintf("%d/%s", p.Port, p.Protocol)
	}
	return fmt.Sprintf("%d:%d/%s", p.Port, p.NodePort, p.Protocol)
}

func (s *service) GetNode() (report.Metadata, report.Parent) {
	node := report.Metadata{
		Timestamp:             time.Now().UTC().Format(time.RFC3339Nano),
		NodeID:                s.UID(),
		NodeType:              report.Service,
		NodeName:              s.Name(),
		KubernetesType:        string(s.Spec.Type),
		KubernetesClusterId:   kubernetesClusterId,
		KubernetesClusterName: kubernetesClusterName,
		KubernetesIP:          s.Spec.ClusterIP,
		KubernetesNamespace:   s.GetNamespace(),
	}
	if len(s.Status.LoadBalancer.Ingress) > 0 {
		var ingressIp []string
		for _, ing := range s.Status.LoadBalancer.Ingress {
			ingressIp = append(ingressIp, ing.IP)
		}
		node.KubernetesIngressIP = ingressIp
	}
	if s.Spec.LoadBalancerIP != "" {
		node.KubernetesPublicIP = s.Spec.LoadBalancerIP
	}
	if len(s.Spec.Ports) != 0 {
		ports := make([]int32, len(s.Spec.Ports))
		for i, p := range s.Spec.Ports {
			ports[i] = p.Port
		}
		node.KubernetesPorts = ports
	}
	parent := report.Parent{
		CloudProvider:     cloudProviderNodeId,
		KubernetesCluster: kubernetesClusterId,
		Namespace:         kubernetesClusterId + "-" + s.GetNamespace(),
	}
	return node, parent
}

func (s *service) ClusterIP() string {
	return s.Spec.ClusterIP
}

func (s *service) LoadBalancerIP() string {
	if len(s.Status.LoadBalancer.Ingress) > 0 {
		for _, ing := range s.Status.LoadBalancer.Ingress {
			return ing.IP
		}
	}
	// If s.Status.LoadBalancer.Ingress is empty, then check s.Spec.LoadBalancerIP
	return s.Spec.LoadBalancerIP
}
