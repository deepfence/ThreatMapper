//go:build !dummy
// +build !dummy

package controls

import (
	"fmt"
	"os/exec"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/router"
	linuxScanner "github.com/deepfence/compliance/scanner"
	linuxScannerUtil "github.com/deepfence/compliance/util"
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

func SetClusterAgentControls(k8sClusterName string) {
	err := router.RegisterControl(ctl.StartComplianceScan,
		func(req ctl.StartComplianceScanRequest) error {
			return StartComplianceScan(req)
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	_, err = exec.Command("/bin/sh", "/home/deepfence/token.sh").CombinedOutput()
	if err != nil {
		log.Error().Msgf("generate token: %v", err)
	} else {
		log.Debug().Msg("Token generated successfully")
	}
	err = router.RegisterControl(ctl.StartAgentUpgrade,
		func(req ctl.StartAgentUpgradeRequest) error {
			log.Info().Msg("Start Cluster Agent Upgrade")
			router.SetUpgrade()
			return StartClusterAgentUpgrade(req)
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = router.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info().Msg("Generate Cluster Agent Diagnostic Logs")
			return SendAgentDiagnosticLogs(req,
				[]string{"/var/log/supervisor", "/var/log/compliance/compliance-status"},
				[]string{})
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
}

func SetAgentControls() {
	err := router.RegisterControl(ctl.StartVulnerabilityScan,
		func(req ctl.StartVulnerabilityScanRequest) error {
			return router.StartVulnerabilityScan(req)
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = router.RegisterControl(ctl.StartSecretScan,
		func(req ctl.StartSecretScanRequest) error {
			return router.StartSecretsScan(req)
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = router.RegisterControl(ctl.StartComplianceScan,
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
				log.Error().Msgf("Error from scan: %+v", err)
				return err
			}
			return nil
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = router.RegisterControl(ctl.StartMalwareScan,
		func(req ctl.StartMalwareScanRequest) error {
			return router.StartMalwareScan(req)
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = router.RegisterControl(ctl.StartAgentUpgrade,
		func(req ctl.StartAgentUpgradeRequest) error {
			log.Info().Msg("Start Agent Upgrade")
			router.SetUpgrade()
			return router.StartAgentUpgrade(req)
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = router.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info().Msg("Generate Agent Diagnostic Logs")
			return SendAgentDiagnosticLogs(req,
				[]string{"/var/log/supervisor", "/var/log/fenced"},
				[]string{"/var/log/fenced/compliance/", "/var/log/fenced/malware-scan/", "/var/log/fenced/secret-scan/"})
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
}
