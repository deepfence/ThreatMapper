//go:build !dummy
// +build !dummy

package controls

import (
	"errors"
	"fmt"
	"os/exec"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/router"
	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/supervisor"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	linuxScanner "github.com/deepfence/compliance/scanner"
	linuxScannerUtil "github.com/deepfence/compliance/util"
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
				[]string{"/var/log/supervisor",
					"/var/log/fenced/compliance-scan-logs",
					"/var/log/deepfenced"},
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

			log.Info().Msg("StartComplianceScan Starting")
			//We need to run this in a goroutine else it will block the
			//fetch and execution of controls
			go func() {
				err := scanner.RunComplianceScan()
				if err != nil {
					log.Error().Msgf("Error from RunComplianceScan: %+v", err)
				}
			}()
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
	err = router.RegisterControl(ctl.StartAgentPlugin,
		func(req ctl.EnableAgentPluginRequest) error {
			log.Info().Msg("Start & download Agent Plugin")
			router.SetUpgrade()
			supervisor.UpgradeProcess(req.PluginName, req.BinUrl)
			return supervisor.StartProcess(req.PluginName)
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = router.RegisterControl(ctl.StopAgentPlugin,
		func(req ctl.DisableAgentPluginRequest) error {
			log.Info().Msg("Stop Agent Plugin")
			return supervisor.StopProcess(req.PluginName)
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
	err = router.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info().Msg("Generate Agent Diagnostic Logs")
			return SendAgentDiagnosticLogs(req,
				[]string{"/var/log/supervisor", "/var/log/fenced", "/var/log/deepfenced"},
				[]string{"/var/log/fenced/compliance/", "/var/log/fenced/malware-scan/", "/var/log/fenced/secret-scan/"})
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}

	//Register the stop scan controls
	err = router.RegisterControl(ctl.StopSecretScan,
		func(req ctl.StopSecretScanRequest) error {
			log.Info().Msg("StopSecretScanRequest called")
			return router.StopSecretScan(req)
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}

	err = router.RegisterControl(ctl.StopMalwareScan,
		func(req ctl.StopMalwareScanRequest) error {
			log.Info().Msg("StopMalwareScanRequest called")
			return router.StopMalwareScan(req)
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}

	err = router.RegisterControl(ctl.StopVulnerabilityScan,
		func(req ctl.StopVulnerabilityScanRequest) error {
			log.Info().Msg("StopVulnerabilityScanRequest called")
			return router.StopVulnerabilityScan(req)
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}

	err = router.RegisterControl(ctl.StopComplianceScan,
		func(req ctl.StopComplianceScanRequest) error {
			log.Info().Msg("StopComplianceScanRequest called")
			scanId, ok := req.BinArgs["scan_id"]
			var err error
			if ok {
				retVal := linuxScanner.StopScan(scanId)
				if retVal == false {
					err = errors.New("Failed to stop scan")
				}
			} else {
				err = errors.New("Missing scan id in the StopComplianceScanRequest")
			}
			return err
		})
	if err != nil {
		log.Error().Msgf("set controls: %v", err)
	}
}
