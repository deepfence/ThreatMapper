//go:build dummy
// +build dummy

package controls

import (
	"bytes"
	"compress/gzip"
	"context"
	_ "embed"
	"encoding/base64"
	"errors"
	"os/exec"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	scopeHostname "github.com/weaveworks/scope/common/hostname"

	dsc "github.com/deepfence/golang_deepfence_sdk/client"
)

//go:embed dummy/sbom.json
var dummy_sbom string

func setClusterAgentControls(k8sClusterName string) {
	err := controls.RegisterControl(ctl.StartComplianceScan,
		func(req ctl.StartComplianceScanRequest) error {
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	_, err = exec.Command("/bin/sh", "/home/deepfence/token.sh").CombinedOutput()
	if err != nil {
		log.Error().Msgf("generate token: %v", err)
	} else {
		log.Debug("Token generated successfully")
	}
	err = controls.RegisterControl(ctl.StartAgentUpgrade,
		func(req ctl.StartAgentUpgradeRequest) error {
			log.Info("Start Cluster Agent Upgrade")
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info("Generate Cluster Agent Diagnostic Logs")
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
}

func setAgentControls() {
	err := controls.RegisterControl(ctl.StartVulnerabilityScan,
		func(req ctl.StartVulnerabilityScanRequest) error {
			return sendDummySbomToConsole(req)
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartSecretScan,
		func(req ctl.StartSecretScanRequest) error {
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartComplianceScan,
		func(req ctl.StartComplianceScanRequest) error {
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartMalwareScan,
		func(req ctl.StartMalwareScanRequest) error {
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartAgentUpgrade,
		func(req ctl.StartAgentUpgradeRequest) error {
			log.Info("Start Agent Upgrade")
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info("Generate Agent Diagnostic Logs")
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
}

func sendDummySbomToConsole(init_req ctl.StartVulnerabilityScanRequest) error {
	//TODO: reuse existing client
	httpsClient, err := common.NewClient()
	if err != nil {
		return err
	}

	hostname := scopeHostname.Get()
	data := dsc.UtilsScanSbomRequest{}
	data.SetImageName("host")
	data.SetImageId("")
	data.SetKubernetesClusterName("")
	data.SetContainerName("")
	data.SetMode("")
	data.SetScanId(init_req.BinArgs["scan_id"])
	data.SetHostName(hostname)
	data.SetNodeId(init_req.NodeId)
	data.SetNodeType("host")
	data.SetScanType("all")

	sbom := []byte(dummy_sbom)
	// compress sbom and encode to base64
	var out bytes.Buffer
	gzw := gzip.NewWriter(&out)
	if _, err := gzw.Write(sbom); err != nil {
		log.Error().Msgf("compress error: %s", err)
		return err
	}
	gzw.Close()

	log.Infof("sbom size: %.4fmb compressed: %.4fmb",
		float64(len(sbom))/1000.0/1000.0, float64(out.Len())/1000.0/1000.0)

	bb := out.Bytes()
	c_sbom := make([]byte, base64.StdEncoding.EncodedLen(len(bb)))
	base64.StdEncoding.Encode(c_sbom, bb)

	data.SetSbom(string(c_sbom))

	req := httpsClient.Client().VulnerabilityAPI.IngestSbom(context.Background())
	req = req.UtilsScanSbomRequest(data)

	resp, err := httpsClient.Client().VulnerabilityAPI.IngestSbomExecute(req)
	if err != nil {
		log.Error(err)
		return err
	}

	log.Debugf("publish sbom to console response: %v", resp)

	return nil
}
