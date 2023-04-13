package kubernetes

import (
	"os"
	"strings"

	"k8s.io/apimachinery/pkg/labels"

	"github.com/weaveworks/scope/probe"
	"github.com/weaveworks/scope/report"
)

// These constants are keys used in node metadata
const (
	//Status         = report.KubernetesStatus
	k8sClusterId   = report.KubernetesClusterId
	k8sClusterName = report.KubernetesClusterName
)

var (
	kubernetesClusterId   string
	kubernetesClusterName string
	cloudProviderNodeId   string
)

// Reporter generate Reports containing Container and ContainerImage topologies
type Reporter struct {
	client             Client
	probeID            string
	probe              *probe.Probe
	hostID             string
	nodeName           string
	k8sClusterTopology report.Topology
	k8sClusterParents  report.Parents
}

// NewReporter makes a new Reporter
func NewReporter(client Client, probeID string, hostID string, probe *probe.Probe, nodeName string) *Reporter {
	kubernetesClusterId = os.Getenv(k8sClusterId)
	kubernetesClusterName = os.Getenv(k8sClusterName)

	reporter := &Reporter{
		client:   client,
		probeID:  probeID,
		probe:    probe,
		hostID:   hostID,
		nodeName: nodeName,
	}
	reporter.k8sClusterTopology, reporter.k8sClusterParents = reporter.kubernetesClusterTopology()
	//client.WatchPods(reporter.podEvent)
	return reporter
}

// Stop unregisters controls.
func (r *Reporter) Stop() {
}

// Name of this reporter, for metrics gathering
func (Reporter) Name() string { return "K8s" }

//func (r *Reporter) podEvent(e Event, pod Pod) {
//	// filter out non-local pods, if we have been given a node name to report on
//	if r.nodeName != "" && pod.NodeName() != r.nodeName {
//		return
//	}
//	switch e {
//	case ADD:
//		rpt := report.MakeReport()
//		rpt.Shortcut = true
//		rpt.Pod.AddNode(pod.GetNode(r.probeID))
//		r.probe.Publish(rpt)
//	case DELETE:
//		rpt := report.MakeReport()
//		rpt.Shortcut = true
//		rpt.Pod.AddNode(
//			report.MakeNodeWith(
//				report.MakePodNodeID(pod.UID()),
//				map[string]string{State: report.StateDeleted},
//			),
//		)
//		r.probe.Publish(rpt)
//	}
//}

// IsPauseImageName indicates whether an image name corresponds to a
// kubernetes pause container image.
func IsPauseImageName(imageName string) bool {
	return strings.Contains(imageName, "google_containers/pause") ||
		strings.Contains(imageName, "k8s.gcr.io/pause") ||
		strings.Contains(imageName, "eks/pause") ||
		strings.Contains(imageName, "kubernetes/pause") ||
		strings.Contains(imageName, "rancher/pause") ||
		strings.Contains(imageName, "banzaicloud/pause") ||
		strings.Contains(imageName, "kubesphere/pause")
}

//func isPauseContainer(n report.Node, rpt report.Report) bool {
//	k8sContainerType, _ := n.Latest.Lookup(report.DockerLabelPrefix + "io.kubernetes.docker.type")
//	if k8sContainerType == "podsandbox" { // this label is added by dockershim
//		return true
//	}
//	containerImageIDs, ok := n.Parents.Lookup(report.ContainerImage)
//	if !ok {
//		return false
//	}
//	for _, imageNodeID := range containerImageIDs {
//		imageNode, ok := rpt.ContainerImage.Nodes[imageNodeID]
//		if !ok {
//			continue
//		}
//		imageName, ok := imageNode.Latest.Lookup(docker.ImageName)
//		if !ok {
//			continue
//		}
//		return report.IsPauseImageName(imageName)
//	}
//	return false
//}

// Tagger adds pod parents to container nodes.
type Tagger struct {
}

// Name of this tagger, for metrics gathering
func (Tagger) Name() string { return "K8s" }

// Tag adds pod parents to container nodes.
func (r *Tagger) Tag(rpt report.Report) (report.Report, error) {
	return rpt, nil
}

// Report generates a Report containing Container and ContainerImage topologies
func (r *Reporter) Report() (report.Report, error) {
	result := report.MakeReport()
	serviceTopology, serviceParents, services, err := r.serviceTopology()
	if err != nil {
		return result, err
	}
	podTopology, podParents, err := r.podTopology(services)
	if err != nil {
		return result, err
	}
	namespaceTopology, namespaceParents, err := r.namespaceTopology()
	if err != nil {
		return result, err
	}
	result.KubernetesCluster.Merge(r.k8sClusterTopology)
	result.KubernetesClusterParents.Merge(r.k8sClusterParents)
	result.Pod.Merge(podTopology)
	result.PodParents.Merge(podParents)
	result.Service.Merge(serviceTopology)
	result.ServiceParents.Merge(serviceParents)
	result.Namespace.Merge(namespaceTopology)
	result.NamespaceParents.Merge(namespaceParents)
	return result, nil
}

func (r *Reporter) kubernetesClusterTopology() (report.Topology, report.Parents) {
	result := report.MakeTopology()
	node, parent := NewKubernetesClusterResource().GetNode()
	cloudProviderNodeId = parent.CloudProvider
	result.AddNode(node)
	return result, report.Parents{node.NodeID: parent}
}

func (r *Reporter) serviceTopology() (report.Topology, report.Parents, []Service, error) {
	var (
		result   = report.MakeTopology()
		services = []Service{}
		parents  = report.MakeParents()
	)
	//result.Controls.AddControl(DescribeControl)
	err := r.client.WalkServices(func(s Service) error {
		node, parent := s.GetNode()
		result.AddNode(node)
		services = append(services, s)
		parents[node.NodeID] = parent
		return nil
	})
	return result, parents, services, err
}

type labelledChild interface {
	Labels() map[string]string
	AddParent(string, string)
	Namespace() string
}

// Match parses the selectors and adds the target as a parent if the selector matches.
func match(namespace string, selector labels.Selector, topology, id string) func(labelledChild) {
	return func(c labelledChild) {
		if namespace == c.Namespace() && selector.Matches(labels.Set(c.Labels())) {
			c.AddParent(topology, id)
		}
	}
}

func (r *Reporter) podTopology(services []Service) (report.Topology, report.Parents, error) {
	var (
		pods      = report.MakeTopology()
		selectors = []func(labelledChild){}
		parents   = report.MakeParents()
	)
	for _, service := range services {
		selectors = append(selectors, match(
			service.Namespace(),
			service.Selector(),
			report.Service,
			service.UID(),
		))
	}

	err := r.client.WalkPods(func(p Pod) error {
		for _, selector := range selectors {
			selector(p)
		}
		node, parent := p.GetNode()
		pods.AddNode(node)
		parents[node.NodeID] = parent
		return nil
	})
	return pods, parents, err
}

func (r *Reporter) namespaceTopology() (report.Topology, report.Parents, error) {
	result := report.MakeTopology()
	parents := report.MakeParents()
	err := r.client.WalkNamespaces(func(ns NamespaceResource) error {
		node := ns.GetNode()
		result.AddNode(node)
		parents[node.NodeID] = report.Parent{
			CloudProvider:     cloudProviderNodeId,
			KubernetesCluster: kubernetesClusterId,
		}
		return nil
	})
	return result, parents, err
}
