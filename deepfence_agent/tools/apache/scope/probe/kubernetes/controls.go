package kubernetes

import (
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	k8sscanner "github.com/deepfence/kubernetes-scanner/scanner/compliance"
	k8sscannerutil "github.com/deepfence/kubernetes-scanner/util"
)

func StartComplianceScan(req ctl.StartComplianceScanRequest) error {
	_, err := k8sscanner.NewComplianceScanner(
		k8sscannerutil.Config{
			ManagementConsoleUrl:      "",
			ManagementConsolePort:     "",
			DeepfenceKey:              "",
			ComplianceCheckType:       "",
			ComplianceBenchmark:       "",
			CloudProvider:             "",
			ScanId:                    "",
			NodeId:                    "",
			NodeName:                  "",
			ComplianceResultsFilePath: "",
			ComplianceStatusFilePath:  "",
		},
		"",
		k8sscannerutil.NsaCisaCheckType)
	if err != nil {
		return err
	}
	return nil
}

func StartClusterAgentUpgrade(req ctl.StartAgentUpgradeRequest) error {
	return nil
}
