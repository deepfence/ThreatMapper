package kubernetes

import (
	"fmt"
	"time"

	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	k8sscanner "github.com/deepfence/kubernetes-scanner/scanner/compliance"
	k8sscannerutil "github.com/deepfence/kubernetes-scanner/util"
	log "github.com/sirupsen/logrus"
)

func StartComplianceScan(req ctl.StartComplianceScanRequest) error {
	scanner, err := k8sscanner.NewComplianceScanner(
		k8sscannerutil.Config{
			ComplianceCheckType:       k8sscannerutil.NsaCisaCheckType,
			ScanId:                    req.BinArgs["scan_id"],
			NodeId:                    req.NodeId,
			NodeName:                  req.NodeId,
			ComplianceResultsFilePath: fmt.Sprintf("/var/log/compliance/compliance-scan/%s.log", req.BinArgs["scan_id"]),
			ComplianceStatusFilePath:  "/var/log/compliance/compliance-status/status.log",
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
}

func StartClusterAgentUpgrade(req ctl.StartAgentUpgradeRequest) error {
	return nil
}

func SendClusterAgentDiagnosticLogs(req ctl.SendAgentDiagnosticLogsRequest, k8sClusterName string) error {
	err := utils.RecursiveZip(
		[]string{"/var/log/compliance/compliance-status"},
		[]string{},
		fmt.Sprintf("/tmp/deepfence-k8s-agent-%s-logs-%s.zip", k8sClusterName, time.Now().Format("2006-01-02-15-04-05")),
	)
	if err != nil {
		return err
	}
	return nil
}
