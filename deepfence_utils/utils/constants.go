package utils

// kafka topics
const (
	VULNERABILITY_SCAN         = "vulnerability-scan"
	CVE_SCAN_LOGS              = "vulnerability-scan-logs"
	SECRET_SCAN                = "secret-scan"
	SECRET_SCAN_LOGS           = "secret-scan-logs"
	MALWARE_SCAN               = "malware-scan"
	MALWARE_SCAN_LOGS          = "malware-scan-logs"
	SBOM_ARTIFACTS             = "sbom-artifact"
	SBOM_CVE_SCAN              = "sbom-cve-scan"
	CLOUD_COMPLIANCE_SCAN      = "cloud-compliance-scan"
	CLOUD_COMPLIANCE_SCAN_LOGS = "cloud-compliance-scan-logs"
	COMPLIANCE_SCAN            = "compliance-scan"
	COMPLIANCE_SCAN_LOGS       = "compliance-scan-logs"
	CLOUD_TRAIL_ALERTS         = "cloudtrail-alert"
)

var Topics = []string{
	VULNERABILITY_SCAN, CVE_SCAN_LOGS,
	SECRET_SCAN, SECRET_SCAN_LOGS,
	MALWARE_SCAN, MALWARE_SCAN_LOGS,
	SBOM_ARTIFACTS, SBOM_CVE_SCAN,
	CLOUD_COMPLIANCE_SCAN, CLOUD_COMPLIANCE_SCAN_LOGS,
	COMPLIANCE_SCAN, COMPLIANCE_SCAN_LOGS,
	CLOUD_TRAIL_ALERTS,
}
