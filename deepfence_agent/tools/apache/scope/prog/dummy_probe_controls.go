//go:build dummy
// +build dummy

package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"math/rand"
	"os/exec"
	"time"

	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	log "github.com/sirupsen/logrus"
	scopeHostname "github.com/weaveworks/scope/common/hostname"
	"github.com/weaveworks/scope/probe/common"
	"github.com/weaveworks/scope/probe/controls"

	dsc "github.com/deepfence/golang_deepfence_sdk/client"

	_ "embed"
)

//go:embed dummy/sbom.json
var dummy_sbom string

func setClusterAgentControls(k8sClusterName string) {
	err := controls.RegisterControl(ctl.StartComplianceScan,
		func(req ctl.StartComplianceScanRequest) error {
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	_, err = exec.Command("/bin/sh", "/home/deepfence/token.sh").CombinedOutput()
	if err != nil {
		log.Errorf("generate token: %v", err)
	} else {
		log.Debug("Token generated successfully")
	}
	err = controls.RegisterControl(ctl.StartAgentUpgrade,
		func(req ctl.StartAgentUpgradeRequest) error {
			log.Info("Start Cluster Agent Upgrade")
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info("Generate Cluster Agent Diagnostic Logs")
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
}

func setAgentControls() {
	err := controls.RegisterControl(ctl.StartVulnerabilityScan,
		func(req ctl.StartVulnerabilityScanRequest) error {
			return sendDummySbomToConsole(req)
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartSecretScan,
		func(req ctl.StartSecretScanRequest) error {
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartComplianceScan,
		func(req ctl.StartComplianceScanRequest) error {
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartMalwareScan,
		func(req ctl.StartMalwareScanRequest) error {
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartAgentUpgrade,
		func(req ctl.StartAgentUpgradeRequest) error {
			log.Info("Start Agent Upgrade")
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info("Generate Agent Diagnostic Logs")
			return errors.New("Not implemented")
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
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
		log.Errorf("compress error: %s", err)
		return err
	}
	gzw.Close()

	log.Infof("sbom size: %.4fmb compressed: %.4fmb",
		float64(len(sbom))/1000.0/1000.0, float64(out.Len())/1000.0/1000.0)

	bb := out.Bytes()
	c_sbom := make([]byte, base64.StdEncoding.EncodedLen(len(bb)))
	base64.StdEncoding.Encode(c_sbom, bb)

	data.SetSbom(string(c_sbom))

	req := httpsClient.Client().VulnerabilityApi.IngestSbom(context.Background())
	req = req.UtilsScanSbomRequest(data)

	resp, err := httpsClient.Client().VulnerabilityApi.IngestSbomExecute(req)
	if err != nil {
		log.Error(err)
		return err
	}

	log.Debugf("publish sbom to console response: %v", resp)

	return nil
}

// Add jitter
func init() {
	rand.Seed(time.Now().UnixNano())

	min := 0
	max := 120

	randomSeconds := rand.Intn(max-min+1) + min

	sleepDuration := time.Duration(randomSeconds) * time.Second
	fmt.Printf("Sleeping for %d seconds...\n", randomSeconds)

	time.Sleep(sleepDuration)
}
