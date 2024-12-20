package docker

import (
	"encoding/json"
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
	customTags            []string
}

// NewReporter makes a new Reporter
func NewReporter(registry Registry, hostID string, probeID string, probe *probe.Probe) *Reporter {
	reporter := &Reporter{
		registry:              registry,
		hostID:                hostID,
		probeID:               probeID,
		isConsoleVm:           dfUtils.IsThisConsoleAgent(),
		probe:                 probe,
		kubernetesClusterName: os.Getenv(report.KubernetesClusterName),
		kubernetesClusterId:   os.Getenv(report.KubernetesClusterId),
		customTags:            dfUtils.GetCustomTags(),
	}
	return reporter
}

// Name of this reporter, for metrics gathering
func (*Reporter) Name() string { return "Docker" }

// Report generates a Report containing Container and ContainerImage topologies
func (r *Reporter) Report() (report.Report, error) {
	localAddrs, err := report.LocalAddresses()
	if err != nil {
		return report.MakeReport(), nil
	}

	var imageIDTagMap map[string]basicImage
	result := report.MakeReport()
	result.ContainerImage, imageIDTagMap = r.containerImageTopology()
	result.Container = r.containerTopology(localAddrs, imageIDTagMap)
	result.Overlay = r.overlayTopology()
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

func (r *Reporter) containerTopology(localAddrs []net.IP, imageIDTagMap map[string]basicImage) report.Topology {
	result := report.MakeTopology()
	nodes := []report.TopologyNode{}
	r.registry.WalkContainers(func(c Container) {
		node := c.GetNode()
		if node != nil {
			nodes = append(nodes, *node)
		}
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

		var networkInfo func(prefix string) (*report.Sets, bool)
		emptySets := report.MakeSets()
		networkInfo = func(prefix string) (ips *report.Sets, isInHostNamespace bool) {
			container, ok := r.registry.GetContainerByPrefix(prefix)
			if !ok {
				return &emptySets, false
			}

			networkMode, ok := container.NetworkMode()
			if ok && strings.HasPrefix(networkMode, "container:") {
				return networkInfo(networkMode[10:])
			} else if ok && networkMode == "host" {
				return &hostNetworkInfo, true
			}

			return container.NetworkInfo(localAddrs), false
		}
		for _, node := range nodes {
			if node.Metadata.NodeID == "" {
				continue
			}
			if basicImageDetails, ok := imageIDTagMap[node.Metadata.DockerImageID]; ok {
				node.Metadata.ImageNameWithTag = basicImageDetails.ImageNameWithTag
				node.Metadata.ImageName = basicImageDetails.ImageName
				node.Metadata.ImageTag = basicImageDetails.ImageTag
			}
			var isInHostNamespace bool
			node.Sets, isInHostNamespace = networkInfo(node.Metadata.NodeID)
			node.Metadata.Tags = r.customTags
			node.Metadata.IsConsoleVm = r.isConsoleVm
			// Indicate whether the container is in the host network
			// The container's NetworkMode is not enough due to
			// delegation (e.g. NetworkMode="container:foo" where
			// foo is a container in the host networking namespace)
			if isInHostNamespace {
				node.Metadata.DockerContainerNetworkMode = "host"
			}
			node.Metadata.KubernetesClusterName = r.kubernetesClusterName
			node.Metadata.KubernetesClusterId = r.kubernetesClusterId
			result.AddNode(node)
		}
	}

	return result
}

type basicImage struct {
	ImageName        string `json:"docker_image_name,omitempty"`
	ImageNameWithTag string `json:"docker_image_name_with_tag,omitempty"`
	ImageTag         string `json:"docker_image_tag,omitempty"`
}

func (r *Reporter) containerImageTopology() (report.Topology, map[string]basicImage) {
	result := report.MakeTopology()
	imageIDTagMap := make(map[string]basicImage)
	r.registry.WalkImages(func(image docker_client.APIImages) {
		imageID := trimImageID(image.ID)
		shortImageID := getShortImageID(imageID)
		metadata := report.Metadata{
			Timestamp:              time.Now().UTC().Format(time.RFC3339Nano),
			NodeID:                 imageID,
			NodeType:               report.ContainerImage,
			DockerImageSize:        humanize.Bytes(uint64(image.Size)),
			DockerImageVirtualSize: humanize.Bytes(uint64(image.VirtualSize)),
			DockerImageCreatedAt:   time.Unix(image.Created, 0).Format("2006-01-02T15:04:05") + "Z",
			HostName:               r.hostID,
			KubernetesClusterId:    r.kubernetesClusterId,
			KubernetesClusterName:  r.kubernetesClusterName,
		}

		if len(image.RepoTags) > 0 {
			imageFullName := image.RepoTags[0]
			metadata.NodeName = imageFullName + " (" + shortImageID + ")"
			metadata.ImageNameWithTag = imageFullName
			metadata.ImageName = ImageNameWithoutTag(imageFullName)
			metadata.ImageTag = ImageNameTag(imageFullName)
			imageIDTagMap[imageID] = basicImage{
				ImageName:        metadata.ImageName,
				ImageNameWithTag: metadata.ImageNameWithTag,
				ImageTag:         metadata.ImageTag,
			}
		}
		if metadata.ImageNameWithTag == "" {
			metadata.NodeName = imageID
		}
		if image.Labels[report.DeepfenceSystemLabelKey] == report.DeepfenceSystemLabelValue {
			metadata.IsDeepfenceSystem = true
		}
		dockerImageLabels, err := json.Marshal(image.Labels)
		if err == nil {
			metadata.DockerLabels = string(dockerImageLabels)
		}
		result.AddNode(report.TopologyNode{
			Metadata: metadata,
			Parents: &report.Parent{
				KubernetesCluster: r.kubernetesClusterId,
				Host:              r.hostID,
			},
		})
	})

	return result, imageIDTagMap
}

func (r *Reporter) overlayTopology() report.Topology {
	subnets := []string{}
	r.registry.WalkNetworks(func(network docker_client.Network) {
		for _, config := range network.IPAM.Config {
			subnets = append(subnets, config.Subnet)
		}

	})
	// Add both local and global networks to the LocalNetworks Set
	// since we treat container IPs as local
	overlayNodeId := report.MakeOverlayNodeID(report.DockerOverlayPeerPrefix, r.hostID)
	metadata := report.Metadata{
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		NodeID:    overlayNodeId,
		NodeType:  report.Overlay,
		HostName:  r.hostID,
	}
	t := report.MakeTopology()
	sets := report.MakeSets()
	sets = sets.Add(report.HostLocalNetworks, report.MakeStringSet(subnets...))
	t.AddNode(report.TopologyNode{
		Metadata: metadata,
		Sets:     &sets,
	})
	return t
}

// Docker sometimes prefixes ids with a "type" annotation, but it renders a bit
// ugly and isn't necessary, so we should strip it off
func trimImageID(id string) string {
	return strings.TrimPrefix(id, "sha256:")
}

func getShortImageID(id string) string {
	return id[:12]
}
