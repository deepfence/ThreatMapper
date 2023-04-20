//go:build !dummy
// +build !dummy

package main

import (
	"fmt"
	"os/exec"
	"strings"

	linuxScanner "github.com/deepfence/compliance/scanner"
	linuxScannerUtil "github.com/deepfence/compliance/util"
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	log "github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/probe/appclient"
	"github.com/weaveworks/scope/probe/controls"
	"github.com/weaveworks/scope/probe/host"
	"github.com/weaveworks/scope/probe/kubernetes"

	_ "embed"
)

//go:embed dummy/sbom.json
var dummy_sbom string

func setClusterAgentControls(k8sClusterName string) {
	err := controls.RegisterControl(ctl.StartComplianceScan,
		func(req ctl.StartComplianceScanRequest) error {
			return kubernetes.StartComplianceScan(req)
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
			appclient.SetUpgrade()
			return kubernetes.StartClusterAgentUpgrade(req)
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info("Generate Cluster Agent Diagnostic Logs")
			return controls.SendAgentDiagnosticLogs(req,
				[]string{"/var/log/supervisor", "/var/log/compliance/compliance-status"},
				[]string{})
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
}

func setAgentControls() {
	err := controls.RegisterControl(ctl.StartVulnerabilityScan,
		func(req ctl.StartVulnerabilityScanRequest) error {
			return host.StartVulnerabilityScan(req)
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartSecretScan,
		func(req ctl.StartSecretScanRequest) error {
			return host.StartSecretsScan(req)
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartComplianceScan,
		func(req ctl.StartComplianceScanRequest) error {
			scanner, err := linuxScanner.NewComplianceScanner(
				linuxScannerUtil.Config{
					ComplianceCheckTypes:      strings.Split(req.BinArgs["benchmark_types"], ","),
					ScanId:                    req.BinArgs["scan_id"],
					NodeId:                    req.NodeId,
					NodeName:                  req.NodeId,
					ComplianceResultsFilePath: fmt.Sprintf("/var/log/fenced/compliance/%s.log", req.BinArgs["scan_id"]),
					ComplianceStatusFilePath:  "/var/log/fenced/compliance-scan-logs/status.log",
				})
			if err != nil {
				return err
			}
			err = scanner.RunComplianceScan()
			if err != nil {
				log.Errorf("Error from scan: %+v", err)
				return err
			}
			return nil
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartMalwareScan,
		func(req ctl.StartMalwareScanRequest) error {
			return host.StartMalwareScan(req)
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.StartAgentUpgrade,
		func(req ctl.StartAgentUpgradeRequest) error {
			log.Info("Start Agent Upgrade")
			appclient.SetUpgrade()
			return host.StartAgentUpgrade(req)
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
	err = controls.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info("Generate Agent Diagnostic Logs")
			return controls.SendAgentDiagnosticLogs(req,
				[]string{"/var/log/supervisor", "/var/log/fenced"},
				[]string{"/var/log/fenced/compliance/", "/var/log/fenced/malware-scan/", "/var/log/fenced/secret-scan/"})
		})
	if err != nil {
		log.Errorf("set controls: %v", err)
	}
}
