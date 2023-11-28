package router

import (
	"encoding/json"
	"fmt"
	"net"
	"os"
	"time"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
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

func StartCloudComplianceScan(req ctl.StartCloudComplianceScanRequest) error {
	log.Info().Msgf("Start Cloud Compliance scan: %v\n", req)
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		fmt.Printf("StartCloudComplianceScan::error in creating cloud compliance scanner client with socket %s: %s\n", CloudScannerSocketPath, err.Error())
		return err
	}
	defer conn.Close()
	scanReq := map[string]interface{}{
		"action": ctl.StartCloudComplianceScan,
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

func StopCloudComplianceScan(req ctl.StopCloudComplianceScanRequest) error {
	fmt.Printf("Stop Cloud Compliance Scan : %v\n", req)
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		fmt.Printf("StopCloudComplianceScan::error in creating cloud compliance scanner client with socket %s: %s\n", CloudScannerSocketPath, err.Error())
		return err
	}
	defer conn.Close()
	scanReq := map[string]interface{}{
		"action": ctl.StopCloudComplianceScan,
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
		"action": ctl.RefreshResources,
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

func GetCloudScannerJobCount() int32 {
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		log.Error().Msgf("GetCloudScannerJobCount::error in creating cloud compliance scanner client with socket %s: %s\n", CloudScannerSocketPath, err.Error())
		return 0
	}
	defer conn.Close()

	jobCountReq := map[string]interface{}{
		"action": ctl.CloudScannerJobCount,
	}
	jobCountReqBytes, err := json.Marshal(jobCountReq)
	if err != nil {
		fmt.Printf("GetCloudScannerJobCount::error in converting request into valid json: %s\n", err.Error())
		return 0
	}
	_, err = conn.Write(jobCountReqBytes)
	if err != nil {
		fmt.Printf("GetCloudScannerJobCount::error in writing data to unix socket %s: %s\n", CloudScannerSocketPath, err.Error())
		return 0
	}
	responseTimeout := 10 * time.Second
	deadline := time.Now().Add(responseTimeout)
	buf := make([]byte, 1024)
	for {
		conn.SetReadDeadline(deadline)
		n, err := conn.Read(buf[:])
		if err != nil {
			return 0
		}
		var jobCount int32
		count, err := fmt.Sscan(string(buf[0:n]), &jobCount)
		if err != nil || count != 1 {
			return 0
		}
		return jobCount
	}
}
