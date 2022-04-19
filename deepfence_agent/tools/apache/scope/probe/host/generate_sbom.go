package host

import (
	"context"
	scopeHostname "github.com/weaveworks/scope/common/hostname"
	pb "github.com/weaveworks/scope/proto"
	"google.golang.org/grpc"
	"os"
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
	conn, err := grpc.Dial("unix://"+packageScannerSocket, grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(maxMsgSize)),
		grpc.WithAuthority("dummy"), grpc.WithInsecure())
	if err != nil {
		return nil, err
	}
	return pb.NewPackageScannerClient(conn), nil
}

func GenerateSbomForVulnerabilityScan(imageName, imageId, scanId, kubernetesClusterName, containerName, scanType string) error {
	ctx := context.Background()

	hostName := scopeHostname.Get()
	var nodeType string
	if imageName == "host" {
		nodeType = "host"
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
	}
	_, err = packageScannerClient.GenerateSBOM(ctx, sbomRequest)
	if err != nil {
		return err
	}
	return nil
}
