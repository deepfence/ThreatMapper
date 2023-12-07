package cri

import (
	"context"
	"encoding/json"
	"os"
	"strings"
	"time"

	dfUtils "github.com/deepfence/df-utils"
	"github.com/dustin/go-humanize"
	client "github.com/weaveworks/scope/cri/runtime"
	"github.com/weaveworks/scope/probe/docker"
	"github.com/weaveworks/scope/report"
)

// Reporter generate Reports containing Container and ContainerImage topologies
type Reporter struct {
	isConsoleVm           bool
	hostID                string
	cri                   client.RuntimeServiceClient
	criImageClient        client.ImageServiceClient
	kubernetesClusterId   string
	kubernetesClusterName string
}

// NewReporter makes a new Reporter
func NewReporter(cri client.RuntimeServiceClient, hostID string, criImageClient client.ImageServiceClient) *Reporter {
	reporter := &Reporter{
		hostID:                hostID,
		cri:                   cri,
		criImageClient:        criImageClient,
		isConsoleVm:           dfUtils.IsThisConsoleAgent(),
		kubernetesClusterName: os.Getenv(report.KubernetesClusterName),
		kubernetesClusterId:   os.Getenv(report.KubernetesClusterId),
	}

	return reporter
}

// Name of this reporter, for metrics gathering
func (*Reporter) Name() string { return "CRI" }

// Report generates a Report containing Container topologies
func (r *Reporter) Report() (report.Report, error) {
	result := report.MakeReport()
	imageTopol, imageMetadataMap, err := r.containerImageTopology()
	if err != nil {
		return report.MakeReport(), err
	}

	containerTopol, err := r.containerTopology(imageMetadataMap)
	if err != nil {
		return report.MakeReport(), err
	}

	result.Container.Merge(containerTopol)
	result.ContainerImage.Merge(imageTopol)
	return result, nil
}

func (r *Reporter) containerTopology(imageMetadataMap map[string]ImageMetadata) (report.Topology, error) {
	result := report.MakeTopology()
	ctx := context.Background()
	resp, err := r.cri.ListContainers(ctx, &client.ListContainersRequest{})
	if err != nil {
		return result, err
	}

	for _, c := range resp.Containers {
		node := r.getNode(c, imageMetadataMap)
		if node == nil {
			continue
		}
		result.AddNode(*node)
	}

	return result, nil
}

func (r *Reporter) getNode(c *client.Container, imageMetadataMap map[string]ImageMetadata) *report.TopologyNode {
	containerState := getState(c)
	if report.SkipReportContainerState[containerState] {
		return nil
	}
	imageMetadata, ok := imageMetadataMap[c.ImageRef]
	var imageID, imageName, imageTag string
	if ok {
		imageID = imageMetadata.ImageID
		imageName = imageMetadata.ImageName
		imageTag = imageMetadata.ImageTag
	} else {
		imageID = trimImageID(c.Image.GetImage())
		imageName, imageTag = docker.ParseImageDigest(c.ImageRef)
	}
	var dockerLabels string
	podName := c.Labels["io.kubernetes.pod.name"]
	podUid := c.Labels["io.kubernetes.pod.uid"]
	dockerLabelsJson, err := json.Marshal(c.Labels)
	if err == nil {
		dockerLabels = string(dockerLabelsJson)
	}

	containerName := c.Metadata.Name
	if containerName == "" {
		containerName = c.Id
	}

	containerCreatedAt := ""
	if c.CreatedAt > 0 {
		containerCreatedAt = time.Unix(c.CreatedAt/1000000000, 0).Format("2006-01-02T15:04:05") + "Z"
	}

	metadata := report.Metadata{
		Timestamp:                 time.Now().UTC().Format(time.RFC3339Nano),
		NodeType:                  report.Container,
		NodeID:                    c.Id,
		NodeName:                  containerName + " / " + r.hostID,
		HostName:                  r.hostID,
		DockerContainerName:       containerName,
		DockerContainerState:      containerState,
		DockerContainerStateHuman: containerState,
		DockerContainerCreated:    containerCreatedAt,
		ImageName:                 imageName,
		ImageTag:                  imageTag,
		DockerImageID:             imageID,
		ImageNameWithTag:          imageName + ":" + imageTag,
		IsConsoleVm:               r.isConsoleVm,
		KubernetesClusterName:     r.kubernetesClusterName,
		KubernetesClusterId:       r.kubernetesClusterId,
		DockerLabels:              dockerLabels,
		PodName:                   podName,
		PodID:                     podUid,
	}
	return &report.TopologyNode{
		Metadata: metadata,
		Parents: &report.Parent{
			KubernetesCluster: r.kubernetesClusterId,
			Host:              r.hostID,
			ContainerImage:    imageID,
			Pod:               podUid,
		},
	}
}

func getState(c *client.Container) string {
	switch c.State.String() {
	case "CONTAINER_RUNNING":
		return report.StateRunning
	case "CONTAINER_EXITED":
		return report.StateExited
	case "CONTAINER_UNKNOWN":
		return report.StateUnknown
	case "CONTAINER_CREATED":
		return report.StateCreated
	default:
		return report.StateUnknown
	}
}

type ImageMetadata struct {
	ImageName string
	ImageTag  string
	ImageID   string
	ImageRef  string
}

func (r *Reporter) containerImageTopology() (report.Topology, map[string]ImageMetadata, error) {
	result := report.MakeTopology()

	ctx := context.Background()
	resp, err := r.criImageClient.ListImages(ctx, &client.ListImagesRequest{})
	if err != nil {
		return result, nil, err
	}

	imageMetadataMap := make(map[string]ImageMetadata, len(resp.Images))
	for _, img := range resp.Images {
		imageNode, imageMetadata := r.getImage(img)
		if imageNode == nil {
			continue
		}
		if imageMetadata.ImageRef != "" {
			imageMetadataMap[imageMetadata.ImageRef] = *imageMetadata
		}
		result.AddNode(*imageNode)
	}

	return result, imageMetadataMap, nil
}

func (r *Reporter) getImage(image *client.Image) (*report.TopologyNode, *ImageMetadata) {
	// image format: sha256:ab21abc2d2c34c2b2d2c23bbcf23gg23f23
	imageID := trimImageID(image.Id)
	shortImageID := getShortImageID(imageID)
	metadata := report.Metadata{
		Timestamp:              time.Now().UTC().Format(time.RFC3339Nano),
		NodeType:               report.ContainerImage,
		NodeID:                 imageID,
		DockerImageSize:        humanize.Bytes(uint64(image.Size())),
		DockerImageVirtualSize: humanize.Bytes(uint64(image.Size())),
		DockerImageCreatedAt:   time.Unix(0, 0).Format("2006-01-02T15:04:05") + "Z",
		HostName:               r.hostID,
		KubernetesClusterId:    r.kubernetesClusterId,
		KubernetesClusterName:  r.kubernetesClusterName,
	}
	var imageRef string
	if len(image.RepoDigests) > 0 {
		imageRef = image.RepoDigests[0]
	}
	if len(image.RepoTags) > 0 {
		imageFullName := image.RepoTags[0]
		metadata.ImageName = docker.ImageNameWithoutTag(imageFullName)
		metadata.ImageTag = docker.ImageNameTag(imageFullName)
		metadata.ImageNameWithTag = metadata.ImageName + ":" + metadata.ImageTag
		metadata.NodeName = metadata.ImageNameWithTag + " (" + shortImageID + ")"
	} else if len(image.RepoDigests) > 0 {
		metadata.ImageName, metadata.ImageTag = docker.ParseImageDigest(image.RepoDigests[0])
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
			ImageID:   imageID,
			ImageRef:  imageRef,
		}
}

// CRI sometimes prefixes ids with a "type" annotation, but it renders a bit
// ugly and isn't necessary, so we should strip it off
func trimImageID(id string) string {
	return strings.TrimPrefix(id, "sha256:")
}

func getShortImageID(id string) string {
	return id[:12]
}
