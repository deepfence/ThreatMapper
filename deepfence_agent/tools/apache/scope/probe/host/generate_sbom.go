package host

import (
	"context"
	"errors"
	"os"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	log "github.com/sirupsen/logrus"
	scopeHostname "github.com/weaveworks/scope/common/hostname"
	pb "github.com/weaveworks/scope/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const (
	packageScannerSocket = "/tmp/package-scanner.sock"
)

var (
	scanPath = "dir:/fenced/mnt/host/"
)

func init() {
	if os.Getenv("DF_SERVERLESS") == "true" {
		scanPath = "dir:/"
	}
}

func createPackageScannerClient() (pb.PackageScannerClient, error) {
	maxMsgSize := 1024 * 1024 * 1 // 1 mb
	conn, err := grpc.Dial(
		"unix://"+packageScannerSocket,
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(maxMsgSize)),
		grpc.WithAuthority("dummy"),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, err
	}
	return pb.NewPackageScannerClient(conn), nil
}

func GenerateSbomForVulnerabilityScan(nodeType, imageName, imageId, scanId, containerId,
	kubernetesClusterName, containerName, scanType string) error {
	ctx := context.Background()

	hostName := scopeHostname.Get()

	packageScannerClient, err := createPackageScannerClient()
	if err != nil {
		return err
	}
	var source string
	if nodeType == "host" {
		source = scanPath
	} else if nodeType == "container_image" {
		if imageId != "" {
			source = imageId
		} else {
			source = imageName
		}
	} else if nodeType == "container" {
		if containerId != "" {
			source = containerId
		} else {
			source = containerName
		}
	}
	sbomRequest := &pb.SBOMRequest{
		Source:                source,
		ScanType:              scanType,
		ContainerName:         containerName,
		KubernetesClusterName: kubernetesClusterName,
		ImageId:               imageId,
		ScanId:                scanId,
		NodeType:              nodeType,
		HostName:              hostName,
		RegistryId:            "",
		ContainerId:           containerId,
	}
	_, err = packageScannerClient.GenerateSBOM(ctx, sbomRequest)
	if err != nil {
		return err
	}
	return nil
}

func StartVulnerabilityScan(req ctl.StartVulnerabilityScanRequest) error {
	var (
		imageName             = "host"
		imageId               = ""
		scanId                = ""
		kubernetesClusterName = ""
		containerName         = ""
		containerId           = ""
		scanType              = "all"
		node_type             = ""
		node_id               = ""
	)

	if node_type_Arg, ok := req.BinArgs["node_type"]; ok {
		node_type = node_type_Arg
	}

	if node_id_Arg, ok := req.BinArgs["node_id"]; ok {
		node_id = node_id_Arg
	}

	switch node_type {
	case "container":
		containerId = node_id
		containerName = node_id
	case "image":
		imageId = node_id
		imageName = node_id
		node_type = "container_image"
	}

	if kubernetesClusterNameArg, ok := req.BinArgs["kubernetes_cluster_name"]; ok {
		kubernetesClusterName = kubernetesClusterNameArg
	}
	if (node_type == "container" && containerId == "") ||
		(node_type == "container_image" && imageId == "") {
		return errors.New("image_id/container_id is required for container/image vulnerability scan")
	}
	if scanTypeArg, ok := req.BinArgs["scan_type"]; ok {
		scanType = scanTypeArg
	}
	if scanIdArg, ok := req.BinArgs["scan_id"]; ok {
		scanId = scanIdArg
	}
	log.Infof("vulnerability scan request: %v", req)
	log.Infof("uploading %s tar to console...", imageName)
	// call package scanner plugin
	go func() {
		err := GenerateSbomForVulnerabilityScan(node_type, imageName, imageId, scanId,
			containerId, kubernetesClusterName, containerName, scanType)
		if err != nil {
			log.Error(err.Error())
		}
	}()
	return nil
}
