package cri

import (
	"context"
	"os"
	"strings"
	"time"

	dfUtils "github.com/deepfence/df-utils"
	"github.com/dustin/go-humanize"
	client "github.com/weaveworks/scope/cri/runtime"
	"github.com/weaveworks/scope/probe/docker"
	"github.com/weaveworks/scope/report"
)

const (
	k8sClusterId   = report.KubernetesClusterId
	k8sClusterName = report.KubernetesClusterName
	IsUiVm         = "is_ui_vm"
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
		isConsoleVm:           dfUtils.IsThisHostUIMachine(),
		kubernetesClusterName: os.Getenv(k8sClusterName),
		kubernetesClusterId:   os.Getenv(k8sClusterId),
	}

	return reporter
}

// Name of this reporter, for metrics gathering
func (Reporter) Name() string { return "CRI" }

// Report generates a Report containing Container topologies
func (r *Reporter) Report() (report.Report, error) {
	result := report.MakeReport()
	imageTopol, imageParents, imageMetadataMap, err := r.containerImageTopology()
	if err != nil {
		return report.MakeReport(), err
	}

	containerTopol, containerParents, err := r.containerTopology(imageMetadataMap)
	if err != nil {
		return report.MakeReport(), err
	}

	result.Container.Merge(containerTopol)
	result.ContainerParents.Merge(containerParents)
	result.ContainerImage.Merge(imageTopol)
	result.ContainerImageParents.Merge(imageParents)
	return result, nil
}

func (r *Reporter) containerTopology(imageMetadataMap map[string]ImageMetadata) (report.Topology, report.Parents, error) {
	result := report.MakeTopology()
	containerParents := report.MakeParents()
	ctx := context.Background()
	resp, err := r.cri.ListContainers(ctx, &client.ListContainersRequest{})
	if err != nil {
		return result, containerParents, err
	}

	for _, c := range resp.Containers {
		metadata, parents := r.getNode(c, imageMetadataMap)
		result.AddNode(metadata)
		containerParents[metadata.NodeID] = parents
	}

	return result, containerParents, nil
}

func (r *Reporter) getNode(c *client.Container, imageMetadataMap map[string]ImageMetadata) (report.Metadata, report.Parent) {
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
	metadata := report.Metadata{
		Timestamp:                 time.Now().UTC().Format(time.RFC3339Nano),
		NodeType:                  report.Container,
		NodeID:                    c.Id,
		NodeName:                  c.Metadata.Name + " / " + r.hostID,
		HostName:                  r.hostID,
		ContainerName:             c.Metadata.Name,
		DockerContainerState:      getState(c),
		DockerContainerStateHuman: getState(c),
		ImageName:                 imageName,
		ImageTag:                  imageTag,
		DockerImageID:             imageID,
		ImageNameWithTag:          imageName + ":" + imageTag,
		IsConsoleVm:               r.isConsoleVm,
		KubernetesClusterName:     k8sClusterName,
		KubernetesClusterId:       k8sClusterId,
		DockerLabels:              &c.Labels,
	}
	parent := report.Parent{
		KubernetesCluster: k8sClusterId,
		Host:              r.hostID,
		ContainerImage:    imageID,
	}
	return metadata, parent
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

func (r *Reporter) containerImageTopology() (report.Topology, report.Parents, map[string]ImageMetadata, error) {
	result := report.MakeTopology()
	containerImageParents := report.MakeParents()

	ctx := context.Background()
	resp, err := r.criImageClient.ListImages(ctx, &client.ListImagesRequest{})
	if err != nil {
		return result, containerImageParents, nil, err
	}

	imageMetadataMap := make(map[string]ImageMetadata, len(resp.Images))
	for _, img := range resp.Images {
		imageNode, imageParents, imageMetadata := r.getImage(img)
		if imageMetadata.ImageRef != "" {
			imageMetadataMap[imageMetadata.ImageRef] = imageMetadata
		}
		result.AddNode(imageNode)
		containerImageParents[imageNode.NodeID] = imageParents
	}

	return result, containerImageParents, imageMetadataMap, nil
}

func (r *Reporter) getImage(image *client.Image) (report.Metadata, report.Parent, ImageMetadata) {
	// logrus.Infof("images: %v", image)
	// image format: sha256:ab21abc2d2c34c2b2d2c23bbcf23gg23f23
	metadata := report.Metadata{
		Timestamp:            time.Now().UTC().Format(time.RFC3339Nano),
		NodeType:             report.ContainerImage,
		NodeID:               image.Id,
		DockerImageSize:      humanize.Bytes(uint64(image.Size())),
		DockerImageCreatedAt: time.Unix(0, 0).Format("2006-01-02T15:04:05") + "Z",
		HostName:             r.hostID,
	}
	var imageRef string
	if len(image.RepoDigests) > 0 {
		imageRef = image.RepoDigests[0]
	}
	if len(image.RepoTags) > 0 {
		imageFullName := image.RepoTags[0]
		metadata.ImageName = docker.ImageNameWithoutTag(imageFullName)
		metadata.ImageTag = docker.ImageNameTag(imageFullName)
		metadata.NodeName = metadata.ImageName + ":" + metadata.ImageTag
		metadata.ImageNameWithTag = metadata.NodeName
	} else if len(image.RepoDigests) > 0 {
		metadata.ImageName, metadata.ImageTag = docker.ParseImageDigest(image.RepoDigests[0])
		metadata.NodeName = metadata.ImageName + ":" + metadata.ImageTag
		metadata.ImageNameWithTag = metadata.NodeName
	} else {
		metadata.ImageName = ""
		metadata.ImageTag = ""
		metadata.NodeName = image.Id
	}
	return metadata, report.Parent{Host: r.hostID}, ImageMetadata{
		ImageName: metadata.ImageName,
		ImageTag:  metadata.ImageTag,
		ImageID:   image.Id,
		ImageRef:  imageRef,
	}
}

// CRI sometimes prefixes ids with a "type" annotation, but it renders a bit
// ugly and isn't necessary, so we should strip it off
func trimImageID(id string) string {
	return strings.TrimPrefix(id, "sha256:")
}
