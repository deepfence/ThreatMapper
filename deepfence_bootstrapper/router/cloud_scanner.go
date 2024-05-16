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
	CloudScannerSocketPath = "/tmp/cloud-scanner.sock"
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
		log.Error().Msgf("StartCloudComplianceScan::error in creating cloud compliance scanner client with socket %s: %s", CloudScannerSocketPath, err.Error())
		return err
	}
	defer conn.Close()
	scanReq := map[string]interface{}{
		"action": ctl.StartCloudComplianceScan,
		"args":   req,
	}
	scanReqBytes, err := json.Marshal(scanReq)
	if err != nil {
		log.Info().Msgf("StartCloudComplianceScan::error in converting request into valid json: %s",
			err.Error())
		return err
	}
	_, err = conn.Write(scanReqBytes)
	if err != nil {
		log.Info().Msgf("StartCloudComplianceScan::error in writing data to unix socket %s: %s",
			CloudScannerSocketPath, err.Error())
		return err
	}
	return nil
}

func StopCloudComplianceScan(req ctl.StopCloudComplianceScanRequest) error {
	log.Info().Msgf("Stop Cloud Compliance Scan : %v", req)
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		log.Info().Msgf("StopCloudComplianceScan::error in creating cloud compliance scanner client with socket %s: %s", CloudScannerSocketPath, err.Error())
		return err
	}
	defer conn.Close()
	scanReq := map[string]interface{}{
		"action": ctl.StopCloudComplianceScan,
		"args":   req,
	}
	scanReqBytes, err := json.Marshal(scanReq)
	if err != nil {
		log.Info().Msgf("StopCloudComplianceScan::error in converting request into valid json: %s",
			err.Error())
		return err
	}
	_, err = conn.Write(scanReqBytes)
	if err != nil {
		log.Info().Msgf("StopCloudComplianceScan::error in writing data to unix socket %s: %s",
			CloudScannerSocketPath, err.Error())
		return err
	}
	return nil
}

func RefreshResources(req ctl.RefreshResourcesRequest) error {
	log.Info().Msgf("Refresh Resources: %v", req)
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		log.Info().Msgf("RefreshResources::error creating CloudCompliance scanner client with socket %s: %s",
			CloudScannerSocketPath, err.Error())
		return err
	}
	defer conn.Close()
	refreshReq := map[string]interface{}{
		"action": ctl.RefreshResources,
		"args":   req,
	}
	refreshReqBytes, err := json.Marshal(refreshReq)
	if err != nil {
		log.Info().Msgf("RefreshResources::error in converting request into valid json: %s", err.Error())
		return err
	}
	_, err = conn.Write(refreshReqBytes)
	if err != nil {
		log.Info().Msgf("RefreshResources::error in writing data to unix socket %s: %s",
			CloudScannerSocketPath, err.Error())
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
		log.Error().Msgf("GetCloudScannerJobCount::error in converting request into valid json: %s\n",
			err.Error())
		return 0
	}
	_, err = conn.Write(jobCountReqBytes)
	if err != nil {
		log.Error().Msgf("GetCloudScannerJobCount::error in writing data to unix socket %s: %s\n", CloudScannerSocketPath, err.Error())
		return 0
	}
	responseTimeout := 10 * time.Second
	deadline := time.Now().Add(responseTimeout)
	buf := make([]byte, 1024)
	for {
		conn.SetReadDeadline(deadline)
		n, err := conn.Read(buf[:])
		if err != nil {
			log.Error().Msgf("Error in read: %s", err.Error())
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

func GetCloudNodeID() (string, error) {
	cloudNodeID := ""
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		log.Error().Msgf("Error creating cloud scanner client with socket %s: %s\n",
			CloudScannerSocketPath, err.Error())
		return cloudNodeID, err
	}
	defer conn.Close()
	reqMap := make(map[string]interface{})
	reqMap["GetCloudNodeID"] = true
	cloudNodeIDReq := map[string]interface{}{
		"args": reqMap,
	}

	cloudNodeIDReqBytes, err := json.Marshal(cloudNodeIDReq)
	if err != nil {
		log.Error().Msgf("Error in converting request into valid json: %s", err.Error())
		return cloudNodeID, err
	}

	_, err = conn.Write(cloudNodeIDReqBytes)
	if err != nil {
		log.Error().Msgf("Error in writing data to unix socket %s: %s\n",
			CloudScannerSocketPath, err.Error())
		return cloudNodeID, err
	}

	responseTimeout := 10 * time.Second
	deadline := time.Now().Add(responseTimeout)
	buf := make([]byte, 1024)
	for {
		conn.SetReadDeadline(deadline)
		n, err := conn.Read(buf[:])
		if err != nil {
			log.Error().Msgf("Error in read: %s", err.Error())
			return cloudNodeID, err
		}

		count, err := fmt.Sscan(string(buf[0:n]), &cloudNodeID)
		if err != nil || count != 1 {
			return cloudNodeID, err
		}
		break
	}
	return cloudNodeID, err
}
