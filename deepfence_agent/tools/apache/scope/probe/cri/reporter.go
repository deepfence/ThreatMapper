package cri

import (
	"context"
	dfUtils "github.com/deepfence/df-utils"
	"os"
	"strings"
	"time"

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
	isUIvm                string
	hostID                string
	cri                   client.RuntimeServiceClient
	criImageClient        client.ImageServiceClient
	kubernetesClusterId   string
	kubernetesClusterName string
}

// NewReporter makes a new Reporter
func NewReporter(cri client.RuntimeServiceClient, hostID string, criImageClient client.ImageServiceClient) *Reporter {
	isUIvm := "false"
	if dfUtils.IsThisHostUIMachine() {
		isUIvm = "true"
	}
	reporter := &Reporter{
		hostID:                hostID,
		cri:                   cri,
		criImageClient:        criImageClient,
		isUIvm:                isUIvm,
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
	containerTopol, err := r.containerTopology()
	if err != nil {
		return report.MakeReport(), err
	}

	imageTopol, err := r.containerImageTopology()
	if err != nil {
		return report.MakeReport(), err
	}

	result.Container = result.Container.Merge(containerTopol)
	result.ContainerImage = result.ContainerImage.Merge(imageTopol)
	return result, nil
}

func (r *Reporter) containerTopology() (report.Topology, error) {
	result := report.MakeTopology().
		WithMetadataTemplates(docker.ContainerMetadataTemplates).
		WithTableTemplates(docker.ContainerTableTemplates)

	ctx := context.Background()
	resp, err := r.cri.ListContainers(ctx, &client.ListContainersRequest{})
	if err != nil {
		return result, err
	}

	for _, c := range resp.Containers {
		result.AddNode(r.getNode(c))
	}

	return result, nil
}

func (r *Reporter) getNode(c *client.Container) report.Node {
	imageName, imageTag := docker.ParseImageDigest(c.ImageRef)
	latests := map[string]string{
		docker.ContainerName:       c.Metadata.Name,
		docker.ContainerID:         c.Id,
		docker.ContainerState:      getState(c),
		docker.ContainerStateHuman: getState(c),
		//docker.ContainerRestartCount: fmt.Sprintf("%v", c.Metadata.Attempt),
		docker.ImageID:   trimImageID(c.Image.GetImage()),
		docker.ImageName: imageName,
		docker.ImageTag:  imageTag,
		IsUiVm:           r.isUIvm,
		"host_name":      r.hostID,
	}
	if r.kubernetesClusterName != "" {
		latests[k8sClusterName] = r.kubernetesClusterName
	}
	if r.kubernetesClusterId != "" {
		latests[k8sClusterId] = r.kubernetesClusterId
	}
	result := report.MakeNodeWith(report.MakeContainerNodeID(c.Id), latests).WithParents(report.MakeSets().
		Add(report.ContainerImage, report.MakeStringSet(report.MakeContainerImageNodeID(c.ImageRef))),
	)
	result = result.AddPrefixPropertyList(docker.LabelPrefix, c.Labels)
	return result
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

func (r *Reporter) containerImageTopology() (report.Topology, error) {
	result := report.MakeTopology().
		WithMetadataTemplates(docker.ContainerImageMetadataTemplates).
		WithTableTemplates(docker.ContainerImageTableTemplates)

	ctx := context.Background()
	resp, err := r.criImageClient.ListImages(ctx, &client.ListImagesRequest{})
	if err != nil {
		return result, err
	}

	for _, img := range resp.Images {
		result.AddNode(getImage(img))
	}

	return result, nil
}

func getImage(image *client.Image) report.Node {
	// logrus.Infof("images: %v", image)
	// image format: sha256:ab21abc2d2c34c2b2d2c23bbcf23gg23f23
	imageID := trimImageID(image.Id)
	nodeID := imageID
	latests := map[string]string{
		docker.ImageID:        imageID,
		docker.ImageSize:      humanize.Bytes(uint64(image.Size())),
		docker.ImageCreatedAt: time.Unix(0, 0).Format("2006-01-02T15:04:05") + "Z",
	}
	if len(image.RepoDigests) > 0 {
		nodeID = image.RepoDigests[0]
	}
	if len(image.RepoTags) > 0 {
		imageFullName := image.RepoTags[0]
		latests[docker.ImageName] = docker.ImageNameWithoutTag(imageFullName)
		latests[docker.ImageTag] = docker.ImageNameTag(imageFullName)
	} else if len(image.RepoDigests) > 0 {
		latests[docker.ImageName], latests[docker.ImageTag] = docker.ParseImageDigest(image.RepoDigests[0])
	}
	result := report.MakeNodeWith(report.MakeContainerImageNodeID(nodeID), latests)
	// todo: remove if useless
	result = result.AddPrefixPropertyList(docker.LabelPrefix, nil)
	return result
}

// CRI sometimes prefixes ids with a "type" annotation, but it renders a bit
// ugly and isn't necessary, so we should strip it off
func trimImageID(id string) string {
	return strings.TrimPrefix(id, "sha256:")
}
