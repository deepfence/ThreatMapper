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

const (
	SCAN_STATUS_SUCCESS    = "COMPLETE"
	SCAN_STATUS_STARTING   = "STARTING"
	SCAN_STATUS_INPROGRESS = "IN_PROGRESS"
	SCAN_STATUS_FAILED     = "FAILED"
)

type Neo4jScanType string

const (
	NEO4J_SECRET_SCAN        Neo4jScanType = "SecretScan"
	NEO4J_VULNERABILITY_SCAN Neo4jScanType = "VulnerabilityScan"
	NEO4J_MALWARE_SCAN       Neo4jScanType = "MalwareScan"
	NEO4J_COMPLIANCE_SCAN    Neo4jScanType = "ComplianceScan"
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
