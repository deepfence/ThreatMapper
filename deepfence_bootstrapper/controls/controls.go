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
	dfUtils "github.com/deepfence/df-utils"
)

var (
	ErrMissingScanID = errors.New("missing scan id in the request")
	ErrStopScan      = errors.New("failed to stop scan")
)

func SetClusterAgentControls(k8sClusterName string) {
	err := router.RegisterControl(ctl.StartComplianceScan, StartComplianceScan)
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}
	_, err = exec.Command("/bin/sh", dfUtils.GetDfInstallDir()+"/home/deepfence/token.sh").CombinedOutput()
	if err != nil {
		log.Error().Err(err).Msg("generate token")
	} else {
		log.Debug().Msg("Token generated successfully")
	}
	err = router.RegisterControl(ctl.StartAgentUpgrade,
		func(req ctl.StartAgentUpgradeRequest) error {
			log.Info().Msg("Start Cluster Agent Upgrade")
			router.SetUpgrade()
			defer router.UnsetUpgrade()
			return StartClusterAgentUpgrade(req)
		})
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}
	err = router.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info().Msg("Generate Cluster Agent Diagnostic Logs")
			return SendAgentDiagnosticLogs(req,
				[]string{dfUtils.GetDfInstallDir() + "/var/log/supervisor",
					dfUtils.GetDfInstallDir() + "/var/log/fenced/compliance-scan-logs",
					dfUtils.GetDfInstallDir() + "/var/log/deepfenced"},
				[]string{})
		})
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}
}

func SetAgentControls() {
	err := router.RegisterControl(ctl.StartVulnerabilityScan, router.StartVulnerabilityScan)
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}

	err = router.RegisterControl(ctl.StartSecretScan, router.StartSecretsScan)
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}
	err = router.RegisterControl(ctl.StartComplianceScan,
		func(req ctl.StartComplianceScanRequest) error {
			scanner, err := linuxScanner.NewComplianceScanner(
				linuxScannerUtil.Config{
					ComplianceCheckTypes:      strings.Split(req.BinArgs["benchmark_types"], ","),
					ScanID:                    req.BinArgs["scan_id"],
					NodeID:                    req.NodeID,
					NodeName:                  req.NodeID,
					ComplianceResultsFilePath: fmt.Sprintf("%s/var/log/fenced/compliance/%s.log", dfUtils.GetDfInstallDir(), req.BinArgs["scan_id"]),
					ComplianceStatusFilePath:  dfUtils.GetDfInstallDir() + "/var/log/fenced/compliance-scan-logs/status.log",
				})
			if err != nil {
				return err
			}

			log.Info().Msg("StartComplianceScan Starting")
			// We need to run this in a goroutine else it will block the
			// fetch and execution of controls
			go func() {
				err := scanner.RunComplianceScan()
				if err != nil {
					log.Error().Err(err).Msg("Error from RunComplianceScan")
				}
			}()
			return nil
		})
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}
	err = router.RegisterControl(ctl.StartMalwareScan, router.StartMalwareScan)
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}
	err = router.RegisterControl(ctl.StartAgentUpgrade,
		func(req ctl.StartAgentUpgradeRequest) error {
			log.Info().Msg("Start Agent Upgrade")
			router.SetUpgrade()
			defer router.UnsetUpgrade()
			return router.StartAgentUpgrade(req)
		})
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}
	err = router.RegisterControl(ctl.StartAgentPlugin,
		func(req ctl.EnableAgentPluginRequest) error {
			log.Info().Msg("Start & download Agent Plugin")
			router.SetUpgrade()
			defer router.UnsetUpgrade()
			err = supervisor.UpgradeProcessFromURL(req.PluginName, req.BinURL)
			if err != nil {
				return err
			}
			return supervisor.StartProcess(req.PluginName)
		})
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}
	err = router.RegisterControl(ctl.StopAgentPlugin,
		func(req ctl.DisableAgentPluginRequest) error {
			log.Info().Msg("Stop Agent Plugin")
			return supervisor.StopProcess(req.PluginName)
		})
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}
	err = router.RegisterControl(ctl.SendAgentDiagnosticLogs,
		func(req ctl.SendAgentDiagnosticLogsRequest) error {
			log.Info().Msg("Generate Agent Diagnostic Logs")
			return SendAgentDiagnosticLogs(req,
				[]string{dfUtils.GetDfInstallDir() + "/var/log/supervisor", dfUtils.GetDfInstallDir() + "/var/log/fenced", dfUtils.GetDfInstallDir() + "/var/log/deepfenced"},
				[]string{dfUtils.GetDfInstallDir() + "/var/log/fenced/compliance/", dfUtils.GetDfInstallDir() + "/var/log/fenced/malware-scan/", dfUtils.GetDfInstallDir() + "/var/log/fenced/secret-scan/"})
		})
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}

	// Register the stop scan controls
	err = router.RegisterControl(ctl.StopSecretScan,
		func(req ctl.StopSecretScanRequest) error {
			log.Info().Msg("StopSecretScanRequest called")
			return router.StopSecretScan(req)
		})
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}

	err = router.RegisterControl(ctl.StopMalwareScan,
		func(req ctl.StopMalwareScanRequest) error {
			log.Info().Msg("StopMalwareScanRequest called")
			return router.StopMalwareScan(req)
		})
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}

	err = router.RegisterControl(ctl.StopVulnerabilityScan,
		func(req ctl.StopVulnerabilityScanRequest) error {
			log.Info().Msg("StopVulnerabilityScanRequest called")
			return router.StopVulnerabilityScan(req)
		})
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}

	err = router.RegisterControl(ctl.StopComplianceScan,
		func(req ctl.StopComplianceScanRequest) error {
			log.Info().Msg("StopComplianceScanRequest called")
			scanID, ok := req.BinArgs["scan_id"]

			if !ok {
				return ErrMissingScanID
			}

			if err := linuxScanner.StopScan(scanID); err != nil {
				return fmt.Errorf("linuxScanner.StopScan: %w", err)
			}

			return nil
		})
	if err != nil {
		log.Error().Err(err).Msg("set controls")
	}

	err = router.RegisterControl(ctl.UpdateAgentThreatIntel,
		func(req ctl.ThreatIntelInfo) error {

			var errs []error

			if err := router.UpdateSecretsRules(req); err != nil {
				log.Error().Err(err).Msg("failed to update secrets rules")
				errs = append(errs, err)
			}

			if err := router.UpdateMalwareRules(req); err != nil {
				log.Error().Err(err).Msg("failed to update malware rules")
				errs = append(errs, err)
			}

			return errors.Join(errs...)
		})
	if err != nil {
		log.Error().Err(err).Msgf("set controls: %v", err)
	}
}
