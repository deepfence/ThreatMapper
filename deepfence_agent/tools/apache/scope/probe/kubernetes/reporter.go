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
)

// Reporter generate Reports containing Container and ContainerImage topologies
type Reporter struct {
	client                    Client
	probeID                   string
	probe                     *probe.Probe
	hostID                    string
	nodeName                  string
	kubernetesClusterResource KubernetesClusterResource
}

// NewReporter makes a new Reporter
func NewReporter(client Client, probeID string, hostID string, probe *probe.Probe, nodeName string) *Reporter {
	kubernetesClusterId = os.Getenv(k8sClusterId)
	kubernetesClusterName = os.Getenv(k8sClusterName)

	reporter := &Reporter{
		client:                    client,
		probeID:                   probeID,
		probe:                     probe,
		hostID:                    hostID,
		nodeName:                  nodeName,
		kubernetesClusterResource: NewKubernetesClusterResource(),
	}
	//client.WatchPods(reporter.podEvent)
	return reporter
}

// Stop unregisters controls.
func (r *Reporter) Stop() {
	r.kubernetesClusterResource.Stop()
}

// Name of this reporter, for metrics gathering
func (*Reporter) Name() string { return "K8s" }

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
	serviceTopology, services, err := r.serviceTopology()
	if err != nil {
		return result, err
	}
	podTopology, err := r.podTopology(services)
	if err != nil {
		return result, err
	}
	namespaceTopology, err := r.namespaceTopology()
	if err != nil {
		return result, err
	}
	result.KubernetesCluster.Merge(r.kubernetesClusterResource.GetTopology())
	result.Pod.Merge(podTopology)
	result.Service.Merge(serviceTopology)
	result.Namespace.Merge(namespaceTopology)
	return result, nil
}

func (r *Reporter) serviceTopology() (report.Topology, []Service, error) {
	var (
		result   = report.MakeTopology()
		services = []Service{}
	)
	//result.Controls.AddControl(DescribeControl)
	err := r.client.WalkServices(func(s Service) error {
		node := s.GetNode()
		result.AddNode(node)
		services = append(services, s)
		return nil
	})
	return result, services, err
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

func (r *Reporter) podTopology(services []Service) (report.Topology, error) {
	var (
		pods      = report.MakeTopology()
		selectors = []func(labelledChild){}
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
		pods.AddNode(p.GetNode())
		return nil
	})
	return pods, err
}

func (r *Reporter) namespaceTopology() (report.Topology, error) {
	result := report.MakeTopology()
	err := r.client.WalkNamespaces(func(ns NamespaceResource) error {
		node := ns.GetNode()
		result.AddNode(node)
		return nil
	})
	return result, err
}
