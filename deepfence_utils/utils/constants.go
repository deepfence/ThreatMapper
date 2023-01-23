package utils

const (
	ErrorUserNotFound = "user not found"
)

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

// task names
const (
	CleanUpGraphDBTask    = "clean_up_graph_db"
	CleanUpPostgresqlTask = "clean_up_postgresql"
	RetryFailedScansTask  = "retry_failed_scans"
	ParseSBOMTask         = "tasks_parse_sbom"
)

const (
	SCAN_STATUS_SUCCESS    = "COMPLETE"
	SCAN_STATUS_STARTING   = "STARTING"
	SCAN_STATUS_INPROGRESS = "IN_PROGRESS"
	SCAN_STATUS_FAILED     = "ERROR"
)

type Neo4jScanType string

const (
	NEO4J_SECRET_SCAN        Neo4jScanType = "SecretScan"
	NEO4J_VULNERABILITY_SCAN Neo4jScanType = "VulnerabilityScan"
	NEO4J_MALWARE_SCAN       Neo4jScanType = "MalwareScan"
	NEO4J_COMPLIANCE_SCAN    Neo4jScanType = "ComplianceScan"
)

type CloudProvider int

const (
	AWS CloudProvider = iota
	GCP
	Azure
	DO
)

func StringToCloudProvider(s string) CloudProvider {
	switch s {
	case "aws":
		return AWS
	case "gcp":
		return GCP
	case "azure":
		return Azure
	case "do":
		return DO
	}
	return -1
}

func ResourceTypeToNeo4jLabel(t CloudProvider) string {
	switch t {
	case AWS:
		return "AWS"
	case GCP:
		return "GCP"
	case Azure:
		return "Azure"
	case DO:
		return "DO"
	}
	return ""
}

var Topics = []string{
	VULNERABILITY_SCAN, VULNERABILITY_SCAN_STATUS,
	SECRET_SCAN, SECRET_SCAN_STATUS,
	MALWARE_SCAN, MALWARE_SCAN_STATUS,
	SBOM_ARTIFACTS, SBOM_CVE_SCAN,
	CLOUD_COMPLIANCE_SCAN, CLOUD_COMPLIANCE_SCAN_STATUS,
	COMPLIANCE_SCAN, COMPLIANCE_SCAN_STATUS,
	CLOUD_TRAIL_ALERTS,
}
