package router

import (
	"context"
	"errors"
	"fmt"
	"os"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	pb "github.com/deepfence/agent-plugins-grpc/srcgo"
	dfUtils "github.com/deepfence/df-utils"
	scopeHostname "github.com/weaveworks/scope/common/hostname"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	packageScannerSocket = dfUtils.GetDfInstallDir() + "/tmp/package-scanner.sock"
	scanPath             = "dir:/fenced/mnt/host/"
)

func init() {
	if os.Getenv("DF_SERVERLESS") == "true" {
		scanPath = "dir:/"
	}
}

func createPackageScannerConn() (*grpc.ClientConn, error) {
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
	return conn, nil
}

func GenerateSbomForVulnerabilityScan(nodeType, imageName, imageID, scanID, containerID,
	kubernetesClusterName, containerName, scanType string) error {
	ctx := context.Background()

	hostName := scopeHostname.Get()

	conn, err := createPackageScannerConn()
	if err != nil {
		return err
	}
	defer conn.Close()

	packageScannerClient := pb.NewPackageScannerClient(conn)
	var source string
	switch nodeType {
	case NodeTypeHost:
		source = scanPath
	case NodeTypeContainerImage:
		source = imageID
		if imageName != "" {
			source = imageName
		}
	case NodeTypeContainer:
		source = containerName
		if containerID != "" {
			source = containerID
		}
	}
	sbomRequest := &pb.SBOMRequest{
		Source:                source,
		ScanType:              scanType,
		ContainerName:         containerName,
		KubernetesClusterName: kubernetesClusterName,
		ImageId:               imageID,
		ScanId:                scanID,
		NodeType:              nodeType,
		HostName:              hostName,
		RegistryId:            "",
		ContainerId:           containerID,
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
		imageID               = ""
		scanID                = ""
		kubernetesClusterName = ""
		containerName         = ""
		containerID           = ""
		scanType              = "all"
		nodeType              = ""
		nodeID                = ""
	)

	if nodeTypeArg, ok := req.BinArgs["node_type"]; ok {
		nodeType = nodeTypeArg
	}

	if nodeIDArg, ok := req.BinArgs["node_id"]; ok {
		nodeID = nodeIDArg
	}

	if imageNameArg, ok := req.BinArgs["image_name"]; ok {
		imageName = imageNameArg
	}

	if scanTypeArg, ok := req.BinArgs["scan_type"]; ok {
		scanType = scanTypeArg
	}

	switch nodeType {
	case "container":
		containerID = nodeID
	case "container_image":
		imageID = nodeID
	case "image":
		imageID = nodeID
		nodeType = "container_image"
	}

	if kubernetesClusterNameArg, ok := req.BinArgs["kubernetes_cluster_name"]; ok {
		kubernetesClusterName = kubernetesClusterNameArg
	}
	if (nodeType == "container" && containerID == "") ||
		(nodeType == "container_image" && (imageID == "" || imageName == "")) {
		return errors.New("image_id/image_name/container_id is required for container/image vulnerability scan")
	}
	if scanTypeArg, ok := req.BinArgs["scan_type"]; ok {
		scanType = scanTypeArg
	}
	if scanIDArg, ok := req.BinArgs["scan_id"]; ok {
		scanID = scanIDArg
	}
	log.Info().Msgf("vulnerability scan request: %v", req)
	log.Info().Msgf("uploading %s sbom to console...", imageName)
	// call package scanner plugin
	go func() {
		err := GenerateSbomForVulnerabilityScan(nodeType, imageName, imageID, scanID,
			containerID, kubernetesClusterName, containerName, scanType)
		if err != nil {
			log.Error().Msgf("%v", err)
		}
	}()
	return nil
}

func GetPackageScannerJobCount() int32 {
	conn, err := grpc.Dial(
		"unix://"+packageScannerSocket,
		grpc.WithAuthority("dummy"),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Error().Msgf("error in creating package scanner client: %s", err.Error())
		return 0
	}
	defer conn.Close()
	client := pb.NewScannersClient(conn)
	jobReport, err := client.ReportJobsStatus(context.Background(), &pb.Empty{})
	if err != nil {
		return 0
	}
	return jobReport.RunningJobs
}

func StopVulnerabilityScan(req ctl.StopVulnerabilityScanRequest) error {
	fmt.Printf("Stop Vulnerability Scan : %v\n", req)
	conn, err := createPackageScannerConn()
	if err != nil {
		fmt.Printf("StopVulnerabilityScanJob::error in creating Vulnerability scanner client: %s\n", err.Error())
		return err
	}
	defer conn.Close()
	client := pb.NewScannersClient(conn)
	var greq pb.StopScanRequest
	greq.ScanId = req.BinArgs["scan_id"]

	_, err = client.StopScan(context.Background(), &greq)
	return err
}
