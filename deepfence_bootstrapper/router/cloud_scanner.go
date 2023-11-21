package router

import (
	"encoding/json"
	"fmt"
	cloud_util "github.com/deepfence/cloud-scanner/util"
	"net"
	"os"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

const (
	START_SCAN        = "start_scan"
	STOP_SCAN         = "stop_scan"
	REFRESH_RESOURCES = "refresh_resources"
)

var (
	CloudScannerSocketPath = getDfInstallDir() + "/tmp/cloud-scanner.sock"
)

var (
	CloudScannerMgmtConsoleUrl string
)

func init() {
	CloudScannerMgmtConsoleUrl = os.Getenv("MGMT_CONSOLE_URL")
	consolePort := os.Getenv("MGMT_CONSOLE_PORT")
	if consolePort != "" && consolePort != "443" {
		CloudScannerMgmtConsoleUrl += ":" + consolePort
	}
}

func StartCloudComplianceScan(req cloud_util.PendingScan) error {
	log.Info().Msgf("Start Cloud Compliance scan: %v\n", req)
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		fmt.Printf("StartCloudComplianceScan::error in creating cloud compliance scanner client with socket %s: %s\n", CloudScannerSocketPath, err.Error())
		return err
	}
	defer conn.Close()
	scanReq := map[string]interface{}{
		"action": START_SCAN,
		"args":   req,
	}
	scanReqBytes, err := json.Marshal(scanReq)
	if err != nil {
		fmt.Printf("StartCloudComplianceScan::error in converting request into valid json: %s\n", err.Error())
		return err
	}
	_, err = conn.Write(scanReqBytes)
	if err != nil {
		fmt.Printf("StartCloudComplianceScan::error in writing data to unix socket %s: %s\n", CloudScannerSocketPath, err.Error())
		return err
	}
	return nil
}

func StopCloudComplianceScan(req ctl.StopComplianceScanRequest) error {
	fmt.Printf("Stop Cloud Compliance Scan : %v\n", req)
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		fmt.Printf("StopCloudComplianceScan::error in creating cloud compliance scanner client with socket %s: %s\n", CloudScannerSocketPath, err.Error())
		return err
	}
	defer conn.Close()
	scanReq := map[string]interface{}{
		"action": STOP_SCAN,
		"args": map[string]interface{}{
			"scan_id": req.BinArgs["scan_id"],
		},
	}
	scanReqBytes, err := json.Marshal(scanReq)
	if err != nil {
		fmt.Printf("StopCloudComplianceScan::error in converting request into valid json: %s\n", err.Error())
		return err
	}
	_, err = conn.Write(scanReqBytes)
	if err != nil {
		fmt.Printf("StopCloudComplianceScan::error in writing data to unix socket %s: %s\n", CloudScannerSocketPath, err.Error())
		return err
	}
	return nil
}

func RefreshResources(req ctl.RefreshResourcesRequest) error {
	fmt.Printf("Refresh Resources: %v\n", req)
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		fmt.Printf("RefreshResources::error in creating cloud compliance scanner client with socket %s: %s\n", CloudScannerSocketPath, err.Error())
		return err
	}
	defer conn.Close()
	refreshReq := map[string]interface{}{
		"action": REFRESH_RESOURCES,
		"args":   req,
	}
	refreshReqBytes, err := json.Marshal(refreshReq)
	if err != nil {
		fmt.Printf("RefreshResources::error in converting request into valid json: %s\n", err.Error())
		return err
	}
	_, err = conn.Write(refreshReqBytes)
	if err != nil {
		fmt.Printf("RefreshResources::error in writing data to unix socket %s: %s\n", CloudScannerSocketPath, err.Error())
		return err
	}
	return nil
}
