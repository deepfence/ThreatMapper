package kubernetes

import (
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	k8sscanner "github.com/deepfence/kubernetes-scanner/scanner/compliance"
	k8sscannerutil "github.com/deepfence/kubernetes-scanner/util"
)

func StartComplianceScan(req ctl.StartComplianceScanRequest) error {
	scanner, err := k8sscanner.NewComplianceScanner(
		k8sscannerutil.Config{
			ComplianceCheckType:       k8sscannerutil.NsaCisaCheckType,
			ScanId:                    "",
			NodeId:                    req.NodeId,
			NodeName:                  "",
			ComplianceResultsFilePath: "/var/log/compliance/compliance-scan/<scan_id>.log",
			ComplianceStatusFilePath:  "/var/log/compliance/compliance-status/status.log",
		})
	if err != nil {
		return err
	}
	err = scanner.RunComplianceScan()
	if err != nil {
		return err
	}
	return nil
}

func StartClusterAgentUpgrade(req ctl.StartAgentUpgradeRequest) error {
	return nil
}
