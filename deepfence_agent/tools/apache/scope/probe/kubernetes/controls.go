package kubernetes

import (
	"fmt"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
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
