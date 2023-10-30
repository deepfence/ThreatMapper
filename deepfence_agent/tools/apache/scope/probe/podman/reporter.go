package podman

import (
	"encoding/json"
	"os"
	"strings"
	"time"

	dfUtils "github.com/deepfence/df-utils"
	"github.com/dustin/go-humanize"
	"github.com/weaveworks/scope/probe/docker"
	"github.com/weaveworks/scope/report"
)

// Reporter generate Reports containing Container and ContainerImage topologies
type Reporter struct {
	isConsoleVm           bool
	hostID                string
	podmanClient          *PodmanClient
	kubernetesClusterId   string
	kubernetesClusterName string
}

// NewReporter makes a new Reporter
func NewReporter(podmanClient *PodmanClient, hostID string) *Reporter {
	reporter := &Reporter{
		hostID:                hostID,
		podmanClient:          podmanClient,
		isConsoleVm:           dfUtils.IsThisConsoleAgent(),
		kubernetesClusterName: os.Getenv(report.KubernetesClusterName),
		kubernetesClusterId:   os.Getenv(report.KubernetesClusterId),
	}

	return reporter
}

// Name of this reporter, for metrics gathering
func (*Reporter) Name() string { return "Podman" }

func (r *Reporter) Report() (report.Report, error) {
	result := report.MakeReport()

	containerImageTopology, imageMetadataMap, err := r.containerImageTopology()
	if err != nil {
		return report.MakeReport(), err
	}

	containerTopology, err := r.containerTopology(imageMetadataMap)
	if err != nil {
		return report.MakeReport(), err
	}

	result.Container.Merge(containerTopology)
	result.ContainerImage.Merge(containerImageTopology)
	return result, nil
}

func (r *Reporter) containerTopology(imageMetadataMap map[string]ImageMetadata) (report.Topology, error) {
	result := report.MakeTopology()

	containers, err := r.podmanClient.ListContainers()
	if err != nil {
		return result, err
	}
	for _, c := range containers {
		node := r.getContainerNode(c, imageMetadataMap)
		if node == nil {
			continue
		}
		result.AddNode(*node)
	}
	return result, nil
}

func (r *Reporter) getContainerNode(c Container, imageMetadataMap map[string]ImageMetadata) *report.TopologyNode {
	containerState := getState(c)
	if report.SkipReportContainerState[containerState] {
		return nil
	}

	imageMetadata, ok := imageMetadataMap[c.ImageID]
	var imageID, imageName, imageTag string
	if ok {
		imageID = imageMetadata.ImageID
		imageName = imageMetadata.ImageName
		imageTag = imageMetadata.ImageTag
	} else {
		imageID = c.ImageID
		imageName = docker.ImageNameWithoutTag(c.Image)
		imageTag = docker.ImageNameTag(c.Image)
	}

	var containerName string
	if len(c.Names) > 0 {
		containerName = strings.Trim(c.Names[0], "/")
	}
	if containerName == "" {
		containerName = c.ID
	}

	var containerLabels string
	containerLabelsJson, err := json.Marshal(c.Labels)
	if err == nil {
		containerLabels = string(containerLabelsJson)
	}

	metadata := report.Metadata{
		Timestamp:                 time.Now().UTC().Format(time.RFC3339Nano),
		NodeType:                  report.Container,
		NodeID:                    c.ID,
		NodeName:                  containerName + " / " + r.hostID,
		HostName:                  r.hostID,
		DockerContainerName:       containerName,
		DockerContainerState:      containerState,
		DockerContainerStateHuman: containerState,
		DockerContainerCommand:    strings.Join(c.Command, " "),
		DockerContainerCreated:    c.Created.Format("2006-01-02T15:04:05") + "Z",
		ImageName:                 imageName,
		ImageTag:                  imageTag,
		DockerImageID:             imageID,
		ImageNameWithTag:          imageName + ":" + imageTag,
		IsConsoleVm:               r.isConsoleVm,
		KubernetesClusterName:     r.kubernetesClusterName,
		KubernetesClusterId:       r.kubernetesClusterId,
		DockerLabels:              containerLabels,
		PodName:                   c.PodName,
		PodID:                     c.Pod,
	}
	return &report.TopologyNode{
		Metadata: metadata,
		Parents: &report.Parent{
			KubernetesCluster: r.kubernetesClusterId,
			Host:              r.hostID,
			ContainerImage:    imageID,
			Pod:               c.Pod,
		},
	}
}

func getState(c Container) string {
	switch c.State {
	case "running":
		return report.StateRunning
	case "stopped", "exited", "removing", "stopping":
		return report.StateExited
	case "paused":
		return report.StatePaused
	case "created", "initialized":
		return report.StateCreated
	default:
		return report.StateUnknown
	}
}

func (r *Reporter) containerImageTopology() (report.Topology, map[string]ImageMetadata, error) {
	result := report.MakeTopology()

	images, err := r.podmanClient.ListImages()
	if err != nil {
		return result, nil, err
	}

	imageMetadataMap := make(map[string]ImageMetadata, len(images))
	for _, image := range images {
		imageNode, imageMetadata := r.getImageNode(image)
		if imageNode == nil {
			continue
		}
		if imageMetadata.ImageRef != "" {
			imageMetadataMap[imageMetadata.ImageID] = *imageMetadata
		}
		result.AddNode(*imageNode)
	}
	return result, imageMetadataMap, nil
}

func (r *Reporter) getImageNode(c ContainerImage) (*report.TopologyNode, *ImageMetadata) {
	shortImageID := getShortImageID(c.ID)

	metadata := report.Metadata{
		Timestamp:              time.Now().UTC().Format(time.RFC3339Nano),
		NodeType:               report.ContainerImage,
		NodeID:                 c.ID,
		DockerImageSize:        humanize.Bytes(uint64(c.Size)),
		DockerImageVirtualSize: humanize.Bytes(uint64(c.VirtualSize)),
		DockerImageCreatedAt:   time.Unix(int64(c.Created), 0).Format("2006-01-02T15:04:05") + "Z",
		HostName:               r.hostID,
		KubernetesClusterId:    r.kubernetesClusterId,
		KubernetesClusterName:  r.kubernetesClusterName,
	}
	var imageRef string
	if len(c.RepoDigests) > 0 {
		imageRef = c.RepoDigests[0]
	}
	if len(c.RepoTags) > 0 {
		imageFullName := c.RepoTags[0]
		metadata.ImageName = docker.ImageNameWithoutTag(imageFullName)
		metadata.ImageTag = docker.ImageNameTag(imageFullName)
		metadata.ImageNameWithTag = metadata.ImageName + ":" + metadata.ImageTag
		metadata.NodeName = metadata.ImageNameWithTag + " (" + shortImageID + ")"
	} else if len(c.RepoDigests) > 0 {
		metadata.ImageName, metadata.ImageTag = docker.ParseImageDigest(c.RepoDigests[0])
		metadata.ImageNameWithTag = metadata.ImageName + ":" + metadata.ImageTag
		metadata.NodeName = metadata.ImageNameWithTag + " (" + shortImageID + ")"
	} else {
		return nil, nil
	}
	return &report.TopologyNode{
			Metadata: metadata,
			Parents:  &report.Parent{Host: r.hostID},
		},
		&ImageMetadata{
			ImageName: metadata.ImageName,
			ImageTag:  metadata.ImageTag,
			ImageID:   c.ID,
			ImageRef:  imageRef,
		}
}

func getShortImageID(id string) string {
	return id[:12]
}

type ImageMetadata struct {
	ImageName string
	ImageTag  string
	ImageID   string
	ImageRef  string
}
