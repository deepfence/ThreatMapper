package host

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/Jeffail/tunny"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	log "github.com/sirupsen/logrus"
	scopeHostname "github.com/weaveworks/scope/common/hostname"
	pb "github.com/weaveworks/scope/proto"
	"google.golang.org/grpc"
)

const (
	packageScannerSocket                = "/tmp/package-scanner.sock"
	defaultVulnerabilityScanConcurrency = 5
)

var (
	scanPath                    = "dir:/fenced/mnt/host/"
	grpcVulnScanWorkerPool      *tunny.Pool
	vulnerabilityScanFile       = getDfInstallDir() + "/var/log/fenced/vulnerability-scan/vulnerability_scan.log"
	vulnerabilityScanStatusFile = getDfInstallDir() + "/var/log/fenced/vulnerability-scan-log/vulnerability_scan_log.log"
)

type vulnScanParameters struct {
	client      pb.PackageScannerClient
	req         *pb.SBOMRequest
	controlArgs map[string]string
	hostName    string
}

func init() {
	os.MkdirAll(filepath.Dir(vulnerabilityScanFile), 0755)
	os.MkdirAll(filepath.Dir(vulnerabilityScanStatusFile), 0755)
	var err error
	scanConcurrency, err = strconv.Atoi(os.Getenv("VULNERABILITY_SCAN_CONCURRENCY"))
	if err != nil {
		scanConcurrency = defaultVulnerabilityScanConcurrency
	}
	grpcVulnScanWorkerPool = tunny.NewFunc(scanConcurrency,
		getAndPublishVulnerabilityScanResultsWrapper)
	mgmtConsoleUrl = os.Getenv("MGMT_CONSOLE_URL")
	consolePort := os.Getenv("MGMT_CONSOLE_PORT")
	if consolePort != "" && consolePort != "443" {
		mgmtConsoleUrl += ":" + consolePort
	}
	deepfenceKey = os.Getenv("DEEPFENCE_KEY")
	if os.Getenv("DF_SERVERLESS") == "true" {
		certPath = "/deepfence/etc/filebeat/filebeat.crt"
		scanDir = "/"
	} else {
		scanDir = HostMountDir
	}
}

func createPackageScannerClient() (pb.PackageScannerClient, error) {
	maxMsgSize := 1024 * 1024 * 1 // 1 mb
	conn, err := grpc.Dial("unix://"+packageScannerSocket,
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(maxMsgSize)),
		grpc.WithAuthority("dummy"), grpc.WithInsecure())
	if err != nil {
		return nil, err
	}
	return pb.NewPackageScannerClient(conn), nil
}

func generateSbomRequest(req ctl.StartVulnerabilityScanRequest) (*pb.SBOMRequest, error) {
	var imageName = "host"
	var imageId = ""
	var scanId = ""
	var kubernetesClusterName = ""
	var containerName = ""
	var containerId = ""

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
		return nil, errors.New("image_id is required for container/image vulnerability scan")
	}
	scanType := "all"
	if scanTypeArg, ok := req.BinArgs["scan_type"]; ok {
		scanType = scanTypeArg
	}
	if scanIdArg, ok := req.BinArgs["scan_id"]; ok {
		scanId = scanIdArg
	}

	hostName := scopeHostname.Get()
	var nodeType string
	if imageName == "host" {
		nodeType = "host"
	} else if containerName != "" {
		nodeType = "container"
	} else {
		nodeType = "container_image"
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
	return sbomRequest, nil
}

func StartVulnerabilityScan(req ctl.StartVulnerabilityScanRequest) error {

	sbomRequest, err := generateSbomRequest(req)
	if err != nil {
		return err
	}

	packageScannerClient, err := createPackageScannerClient()
	if err != nil {
		return err
	}
	go grpcVulnScanWorkerPool.Process(vulnScanParameters{
		client:      packageScannerClient,
		req:         sbomRequest,
		controlArgs: req.BinArgs,
		hostName:    req.Hostname,
	})
	return nil
}

func getAndPublishVulnerabilityScanResultsWrapper(scanParametersInterface interface{}) interface{} {
	scanParameters, ok := scanParametersInterface.(vulnScanParameters)
	if !ok {
		fmt.Println("Error reading input from grpc API")
		return nil
	}
	getAndPublishVulnerabilityScanResults(scanParameters.client, scanParameters.req,
		scanParameters.controlArgs, scanParameters.hostName)
	return nil
}

func getAndPublishVulnerabilityScanResults(client pb.PackageScannerClient, req *pb.SBOMRequest,
	controlArgs map[string]string, hostName string) {
	var scanLog = make(map[string]interface{})
	scanLog["node_id"] = controlArgs["node_id"]
	scanLog["node_type"] = controlArgs["node_type"]
	scanLog["node_name"] = hostName
	scanLog["container_name"] = controlArgs["container_name"]
	scanLog["kubernetes_cluster_name"] = controlArgs["kubernetes_cluster_name"]
	scanLog["host_name"] = hostName
	scanLog["scan_id"] = controlArgs["scan_id"]
	scanLog["masked"] = "false"
	scanLog["scan_status"] = "IN_PROGRESS"
	scanLog["time_stamp"] = getTimestamp()
	scanLog["@timestamp"] = getCurrentTime()

	byteJson, err := json.Marshal(scanLog)
	if err != nil {
		log.Errorf("err marshalling json: %s", err)
		return
	}

	err = writeToFile(string(byteJson), vulnerabilityScanStatusFile)
	if err != nil {
		log.Errorf("error in sending data to mark in progress: %s" + err.Error())
	}

	res, err := client.GenerateSBOM(context.Background(), req)
	if err != nil {
		scanLog["scan_status"] = "ERROR"
		scanLog["scan_message"] = err.Error()
		scanLog["time_stamp"] = getTimestamp()
		scanLog["@timestamp"] = getCurrentTime()
		byteJson, err = json.Marshal(scanLog)
		if err != nil {
			log.Errorf("error marshalling json: %s", err)
			return
		}
		writeToFile(string(byteJson), vulnerabilityScanStatusFile)
		return
	}

	sbom, err := os.ReadFile(res.GetSbomPath())
	if err != nil {
		scanLog["scan_status"] = "ERROR"
		scanLog["scan_message"] = err.Error()
		scanLog["time_stamp"] = getTimestamp()
		scanLog["@timestamp"] = getCurrentTime()
		byteJson, err = json.Marshal(scanLog)
		if err != nil {
			log.Errorf("error marshalling json: %s", err)
			return
		}
		writeToFile(string(byteJson), vulnerabilityScanStatusFile)
		return
	}
	defer os.Remove(res.GetSbomPath())

	sbomData := make(map[string]interface{})
	if err := json.Unmarshal(sbom, &sbomData); err != nil {
		scanLog["scan_status"] = "ERROR"
		scanLog["scan_message"] = err.Error()
		scanLog["time_stamp"] = getTimestamp()
		scanLog["@timestamp"] = getCurrentTime()
		byteJson, err = json.Marshal(scanLog)
		if err != nil {
			log.Errorf("error marshalling json: %s", err)
			return
		}
		writeScanDataToFile(string(byteJson), vulnerabilityScanStatusFile)
		return
	}

	var scanDoc = make(map[string]interface{})
	scanDoc["node_id"] = controlArgs["node_id"]
	scanDoc["node_type"] = controlArgs["node_type"]
	scanDoc["node_name"] = hostName
	scanDoc["host_name"] = hostName
	scanDoc["scan_id"] = controlArgs["scan_id"]
	scanDoc["container_name"] = controlArgs["container_name"]
	scanDoc["kubernetes_cluster_name"] = controlArgs["kubernetes_cluster_name"]
	scanDoc["sbom"] = sbomData
	byteJson, err = json.Marshal(scanDoc)
	if err != nil {
		scanLog["scan_status"] = "ERROR"
		scanLog["scan_message"] = err.Error()
		scanLog["time_stamp"] = getTimestamp()
		scanLog["@timestamp"] = getCurrentTime()
		byteJson, err = json.Marshal(scanLog)
		if err != nil {
			log.Errorf("error marshalling json: %s", err)
			return
		}
		writeToFile(string(byteJson), vulnerabilityScanStatusFile)
		return
	}
	err = writeToFile(string(byteJson), vulnerabilityScanFile)
	if err != nil {
		scanLog["scan_status"] = "ERROR"
		scanLog["scan_message"] = err.Error()
		scanLog["time_stamp"] = getTimestamp()
		scanLog["@timestamp"] = getCurrentTime()
		byteJson, err = json.Marshal(scanLog)
		if err != nil {
			log.Errorf("error marshalling json: %s", err)
			return
		}
		writeToFile(string(byteJson), vulnerabilityScanStatusFile)
		return
	}

	scanLog["scan_status"] = "COMPLETE"
	scanLog["time_stamp"] = getTimestamp()
	scanLog["@timestamp"] = getCurrentTime()
	byteJson, err = json.Marshal(scanLog)
	if err != nil {
		log.Errorf("error marshalling json: %s", err)
		return
	}
	err = writeToFile(string(byteJson), vulnerabilityScanStatusFile)
	if err != nil {
		log.Errorf("error in sending data %s", err.Error())
	}

}

func writeToFile(msg string, filename string) error {
	out, err := os.OpenFile(filename, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0600)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = out.WriteString(strings.Replace(msg, "\n", " ", -1) + "\n")
	if err != nil {
		return err
	}
	return nil
}
