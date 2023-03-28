package docker

import (
	"net"
	"os"
	"strings"
	"time"

	dfUtils "github.com/deepfence/df-utils"

	humanize "github.com/dustin/go-humanize"
	docker_client "github.com/fsouza/go-dockerclient"

	"github.com/weaveworks/scope/probe"
	"github.com/weaveworks/scope/report"
)

// Reporter generate Reports containing Container and ContainerImage topologies
type Reporter struct {
	registry              Registry
	hostID                string
	probeID               string
	isConsoleVm           bool
	probe                 *probe.Probe
	kubernetesClusterId   string
	kubernetesClusterName string
}

// NewReporter makes a new Reporter
func NewReporter(registry Registry, hostID string, probeID string, probe *probe.Probe) *Reporter {
	reporter := &Reporter{
		registry:              registry,
		hostID:                hostID,
		probeID:               probeID,
		isConsoleVm:           dfUtils.IsThisHostUIMachine(),
		probe:                 probe,
		kubernetesClusterName: os.Getenv(report.KubernetesClusterName),
		kubernetesClusterId:   os.Getenv(report.KubernetesClusterId),
	}
	registry.WatchContainerUpdates(reporter.ContainerUpdated)
	return reporter
}

// Name of this reporter, for metrics gathering
func (Reporter) Name() string { return "Docker" }

// ContainerUpdated should be called whenever a container is updated.
func (r *Reporter) ContainerUpdated(n report.Metadata, p report.Parent) {
	// Publish a 'short cut' report container just this container
	rpt := report.MakeReport()
	rpt.Shortcut = true
	rpt.Container.AddNode(n)
	r.probe.Publish(rpt)
}

// Report generates a Report containing Container and ContainerImage topologies
func (r *Reporter) Report() (report.Report, error) {
	localAddrs, err := report.LocalAddresses()
	if err != nil {
		return report.MakeReport(), nil
	}

	result := report.MakeReport()
	result.Container, result.ContainerSets = r.containerTopology(localAddrs)
	result.ContainerImage = r.containerImageTopology()
	result.Overlay, result.OverlaySets = r.overlayTopology()
	return result, nil
}

// Get local addresses both as strings and IP addresses, in matched slices
func getLocalIPs() ([]string, []net.IP, error) {
	ipnets, err := report.GetLocalNetworks()
	if err != nil {
		return nil, nil, err
	}
	ips := []string{}
	addrs := []net.IP{}
	for _, ipnet := range ipnets {
		ips = append(ips, ipnet.IP.String())
		addrs = append(addrs, ipnet.IP)
	}
	return ips, addrs, nil
}

func (r *Reporter) containerTopology(localAddrs []net.IP) (report.Topology, report.TopologySets) {
	result := report.MakeTopology()
	containerSets := report.TopologySets{}
	nodes := []report.Metadata{}
	r.registry.WalkContainers(func(c Container) {
		nodes = append(nodes, c.GetNode())
	})

	// Copy the IP addresses from other containers where they share network
	// namespaces & deal with containers in the host net namespace.  This
	// is recursive to deal with people who decide to be clever.
	{
		hostNetworkInfo := report.MakeSets()
		if hostStrs, hostIPs, err := getLocalIPs(); err == nil {
			hostIPsWithScopes := addScopeToIPs(r.hostID, hostIPs)
			hostNetworkInfo = hostNetworkInfo.
				Add(ContainerIPs, report.MakeStringSet(hostStrs...)).
				Add(ContainerIPsWithScopes, report.MakeStringSet(hostIPsWithScopes...))
		}

		var networkInfo func(prefix string) (report.Sets, bool)
		networkInfo = func(prefix string) (ips report.Sets, isInHostNamespace bool) {
			container, ok := r.registry.GetContainerByPrefix(prefix)
			if !ok {
				return report.MakeSets(), false
			}

			networkMode, ok := container.NetworkMode()
			if ok && strings.HasPrefix(networkMode, "container:") {
				return networkInfo(networkMode[10:])
			} else if ok && networkMode == "host" {
				return hostNetworkInfo, true
			}

			return container.NetworkInfo(localAddrs), false
		}
		containerImageTags := r.registry.GetContainerTags()
		for _, node := range nodes {
			if node.NodeID == "" {
				continue
			}
			networkInfo, isInHostNamespace := networkInfo(node.NodeID)
			containerSets[node.NodeID] = networkInfo
			tags, ok := containerImageTags[node.NodeID]
			if !ok {
				tags = []string{}
			}
			node.IsConsoleVm = r.isConsoleVm
			node.UserDefinedTags = tags
			// Indicate whether the container is in the host network
			// The container's NetworkMode is not enough due to
			// delegation (e.g. NetworkMode="container:foo" where
			// foo is a container in the host networking namespace)
			if isInHostNamespace {
				node.DockerContainerNetworkMode = "host"
			}
			node.KubernetesClusterName = r.kubernetesClusterName
			node.KubernetesClusterId = r.kubernetesClusterId
			result.AddNode(node)
		}
	}

	return result, containerSets
}

func (r *Reporter) containerImageTopology() report.Topology {
	result := report.MakeTopology()

	imageTagsMap := r.registry.GetImageTags()
	r.registry.WalkImages(func(image docker_client.APIImages) {
		imageID := trimImageID(image.ID)
		node := report.Metadata{
			Timestamp:              time.Now().UTC().Format(time.RFC3339Nano),
			NodeID:                 imageID,
			NodeType:               report.ContainerImage,
			DockerImageSize:        humanize.Bytes(uint64(image.Size)),
			DockerImageVirtualSize: humanize.Bytes(uint64(image.VirtualSize)),
			DockerImageCreatedAt:   time.Unix(image.Created, 0).Format("2006-01-02T15:04:05") + "Z",
		}

		if len(image.RepoTags) > 0 {
			imageFullName := image.RepoTags[0]
			node.NodeName = imageFullName
			node.ImageNameWithTag = imageFullName
			node.ImageName = ImageNameWithoutTag(imageFullName)
			node.ImageTag = ImageNameTag(imageFullName)
		}
		var tags []string
		var ok bool
		if node.ImageNameWithTag != "" {
			tags, ok = imageTagsMap[node.ImageNameWithTag]
			if !ok {
				tags = []string{}
			}
		} else {
			node.NodeName = imageID
		}

		node.UserDefinedTags = tags
		node.DockerImageLabels = &image.Labels
		result.AddNode(node)
	})

	return result
}

func (r *Reporter) overlayTopology() (report.Topology, report.TopologySets) {
	subnets := []string{}
	r.registry.WalkNetworks(func(network docker_client.Network) {
		for _, config := range network.IPAM.Config {
			subnets = append(subnets, config.Subnet)
		}

	})
	// Add both local and global networks to the LocalNetworks Set
	// since we treat container IPs as local
	overlayNodeId := report.MakeOverlayNodeID(report.DockerOverlayPeerPrefix, r.hostID)
	node := report.Metadata{
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		NodeID:    overlayNodeId,
		NodeType:  report.Overlay,
		HostName:  r.hostID,
	}
	overlaySets := report.TopologySets{overlayNodeId: report.MakeSets().Add(report.HostLocalNetworks, report.MakeStringSet(subnets...))}
	t := report.MakeTopology()
	t.AddNode(node)
	return t, overlaySets
}

// Docker sometimes prefixes ids with a "type" annotation, but it renders a bit
// ugly and isn't necessary, so we should strip it off
func trimImageID(id string) string {
	return strings.TrimPrefix(id, "sha256:")
}
