package router

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path"
	"time"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	dfUtils "github.com/deepfence/df-utils"
)

var (
	CloudScannerSocketPath = "/tmp/cloud-scanner.sock"

	cloudPostureControlsHash string

	cloudPostureControlsPath = path.Join(dfUtils.GetDfInstallDir(), "steampipe/")
)

const (
	postureControlsDirectoryUserGroup = "deepfence:root"
)

func changePostureControlsDirectoryOwner() {
	cmd := exec.Command("chown", "-R", postureControlsDirectoryUserGroup, cloudPostureControlsPath)
	stdOut, stdErr := cmd.CombinedOutput()
	if stdErr != nil {
		log.Error().Msgf("Error changing directory permission: %v", stdErr)
		log.Error().Msgf(string(stdOut))
	}
}

// UpdateCloudPostureControls download, update rules
func UpdateCloudPostureControls(req ctl.ThreatIntelInfo) error {
	if req.CloudPostureControlsHash == cloudPostureControlsHash {
		log.Warn().Msgf("skip cloud posture controls update, already new")
		return nil
	}

	newRules := "new_cloud_posture_controls.tar.gz"

	if err := downloadFile(newRules, req.CloudPostureControlsURL); err != nil {
		log.Error().Err(err).Msg("failed to download cloud posture controls")
		return err
	}
	defer os.Remove(newRules)

	log.Info().Msgf("completed downloading from url %s", req.CloudPostureControlsURL)

	// remove old rules
	os.RemoveAll(cloudPostureControlsPath)

	data, err := os.ReadFile(newRules)
	if err != nil {
		log.Error().Err(err).Msg("failed to open new rules")
		return err
	}

	if err := utils.ExtractTarGz(bytes.NewReader(data), cloudPostureControlsPath); err != nil {
		log.Error().Err(err).Msg("failed to extract rules")
		return err
	}

	changePostureControlsDirectoryOwner()

	log.Info().Msg("cloud posture controls updated")

	// set to new hash
	cloudPostureControlsHash = req.CloudPostureControlsHash

	return nil
}

func StartCloudComplianceScan(req ctl.StartCloudComplianceScanRequest) error {
	log.Info().Msgf("Start Cloud Compliance scan: %s, scan id: %s, scan types:%v\n", req.ScanDetails.AccountId, req.ScanDetails.ScanId, req.ScanDetails.ScanTypes)
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		log.Error().Err(err).Msgf("StartCloudComplianceScan: error in creating cloud compliance scanner client with socket %s", CloudScannerSocketPath)
		return err
	}
	defer conn.Close()
	scanReq := map[string]interface{}{
		"action": ctl.StartCloudComplianceScan,
		"args":   req,
	}
	scanReqBytes, err := json.Marshal(scanReq)
	if err != nil {
		log.Error().Err(err).Msg("StartCloudComplianceScan: error in converting request into valid json")
		return err
	}
	_, err = conn.Write(scanReqBytes)
	if err != nil {
		log.Error().Err(err).Msgf("StartCloudComplianceScan: error in writing data to unix socket %s", CloudScannerSocketPath)
		return err
	}
	return nil
}

func StopCloudComplianceScan(req ctl.StopCloudComplianceScanRequest) error {
	log.Info().Msgf("Stop Cloud Compliance Scan: %v", req)
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		log.Error().Err(err).Msgf("StopCloudComplianceScan: error in creating cloud compliance scanner client with socket %s", CloudScannerSocketPath)
		return err
	}
	defer conn.Close()
	scanReq := map[string]interface{}{
		"action": ctl.StopCloudComplianceScan,
		"args":   req,
	}
	scanReqBytes, err := json.Marshal(scanReq)
	if err != nil {
		log.Error().Err(err).Msg("StopCloudComplianceScan: error in converting request into valid json")
		return err
	}
	_, err = conn.Write(scanReqBytes)
	if err != nil {
		log.Error().Err(err).Msgf("StopCloudComplianceScan: error in writing data to unix socket %s", CloudScannerSocketPath)
		return err
	}
	return nil
}

func RefreshResources(req ctl.RefreshResourcesRequest) error {
	log.Info().Msgf("Refresh Resources: %v", req)
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		log.Error().Err(err).Msgf("RefreshResources: error creating CloudCompliance scanner client with socket %s", CloudScannerSocketPath)
		return err
	}
	defer conn.Close()
	refreshReq := map[string]interface{}{
		"action": ctl.RefreshResources,
		"args":   req,
	}
	refreshReqBytes, err := json.Marshal(refreshReq)
	if err != nil {
		log.Error().Err(err).Msg("RefreshResources: error in converting request into valid json")
		return err
	}
	_, err = conn.Write(refreshReqBytes)
	if err != nil {
		log.Error().Err(err).Msgf("RefreshResources: error in writing data to unix socket %s", CloudScannerSocketPath)
		return err
	}
	return nil
}

func GetCloudScannerJobCount(action ctl.ActionID) int32 {
	conn, err := net.Dial("unix", CloudScannerSocketPath)
	if err != nil {
		log.Error().Err(err).Msgf("GetCloudScannerJobCount: error in creating cloud compliance scanner client with socket %s", CloudScannerSocketPath)
		return 0
	}
	defer conn.Close()

	jobCountReq := map[string]interface{}{
		"action": action,
	}
	jobCountReqBytes, err := json.Marshal(jobCountReq)
	if err != nil {
		log.Error().Err(err).Msg("GetCloudScannerJobCount: error in converting request into valid json")
		return 0
	}
	_, err = conn.Write(jobCountReqBytes)
	if err != nil {
		log.Error().Err(err).Msgf("GetCloudScannerJobCount: error in writing data to unix socket %s", CloudScannerSocketPath)
		return 0
	}
	responseTimeout := 10 * time.Second
	deadline := time.Now().Add(responseTimeout)
	buf := make([]byte, 1024)
	for {
		conn.SetReadDeadline(deadline)
		n, err := conn.Read(buf[:])
		if err != nil {
			log.Error().Err(err).Msg("Error in read")
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
