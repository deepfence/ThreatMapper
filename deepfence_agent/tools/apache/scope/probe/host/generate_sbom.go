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

func GenerateSbomForVulnerabilityScan(imageName, imageId, scanId, containerId,
	kubernetesClusterName, containerName, scanType string) error {
	ctx := context.Background()

	hostName := scopeHostname.Get()
	var nodeType string
	if imageName == "host" {
		nodeType = "host"
	} else if containerName != "" {
		nodeType = "container"
	} else {
		nodeType = "container_image"
	}
	packageScannerClient, err := createPackageScannerClient()
	if err != nil {
		return err
	}
	var source string
	if imageName == "host" {
		source = scanPath
	} else {
		source = imageName
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
	)

	if imageNameArg, ok := req.BinArgs["image_name"]; ok {
		imageName = imageNameArg
	}
	if containerNameArg, ok := req.BinArgs["container_name"]; ok {
		containerName = containerNameArg
	}
	if kubernetesClusterNameArg, ok := req.BinArgs["kubernetes_cluster_name"]; ok {
		kubernetesClusterName = kubernetesClusterNameArg
	}
	if imageIdArg, ok := req.BinArgs["image_id"]; ok {
		imageId = imageIdArg
	}
	if containerIdArg, ok := req.BinArgs["container_id"]; ok {
		containerId = containerIdArg
	}
	if imageName != "host" && imageId == "" {
		return errors.New("image_id is required for container/image vulnerability scan")
	}
	if scanTypeArg, ok := req.BinArgs["scan_type"]; ok {
		scanType = scanTypeArg
	}
	if scanIdArg, ok := req.BinArgs["scan_id"]; ok {
		scanId = scanIdArg
	}
	log.Infof("uploading %s tar to console...", imageName)
	// call package scanner plugin
	go func() {
		err := GenerateSbomForVulnerabilityScan(imageName, imageId, scanId,
			containerId, kubernetesClusterName, containerName, scanType)
		if err != nil {
			log.Error(err.Error())
		}
	}()
	return nil
}
