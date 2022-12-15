package utils

// kafka topics
const (
	VULNERABILITY_SCAN           = "vulnerability-scan"
	VULNERABILITY_SCAN_STATUS    = "vulnerability-scan-status"
	SECRET_SCAN                  = "secret-scan"
	SECRET_SCAN_STATUS           = "secret-scan-status"
	MALWARE_SCAN                 = "malware-scan"
	MALWARE_SCAN_STATUS          = "malware-scan-status"
	SBOM_ARTIFACTS               = "sbom-artifact"
	SBOM_CVE_SCAN                = "sbom-cve-scan"
	CLOUD_COMPLIANCE_SCAN        = "cloud-compliance-scan"
	CLOUD_COMPLIANCE_SCAN_STATUS = "cloud-compliance-scan-status"
	COMPLIANCE_SCAN              = "compliance-scan"
	COMPLIANCE_SCAN_STATUS       = "compliance-scan-status"
	CLOUD_TRAIL_ALERTS           = "cloudtrail-alert"
)

var Topics = []string{
	VULNERABILITY_SCAN, VULNERABILITY_SCAN_STATUS,
	SECRET_SCAN, SECRET_SCAN_STATUS,
	MALWARE_SCAN, MALWARE_SCAN_STATUS,
	SBOM_ARTIFACTS, SBOM_CVE_SCAN,
	CLOUD_COMPLIANCE_SCAN, CLOUD_COMPLIANCE_SCAN_STATUS,
	COMPLIANCE_SCAN, COMPLIANCE_SCAN_STATUS,
	CLOUD_TRAIL_ALERTS,
}
