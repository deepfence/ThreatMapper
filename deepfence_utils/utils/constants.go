package utils

const (
	ErrorUserNotFound = "user not found"
)

const (
	Project = "ThreatMapper"
)

// kafka topics
const (
	AUDIT_LOGS                   = "audit-logs"
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
	CLOUD_RESOURCE               = "cloud-resource"
)

// task names
const (
	CleanUpGraphDBTask                = "clean_up_graph_db"
	CleanUpPostgresqlTask             = "clean_up_postgresql"
	CleanupDiagnosisLogs              = "clean_up_diagnosis_logs"
	RetryFailedScansTask              = "retry_failed_scans"
	RetryFailedUpgradesTask           = "retry_failed_upgrades"
	ScanSBOMTask                      = "tasks_scan_sbom"
	GenerateSBOMTask                  = "tasks_generate_sbom"
	CheckAgentUpgradeTask             = "tasks_check_agent_upgrade"
	SyncRegistryTask                  = "task_sync_registry"
	TriggerConsoleActionsTask         = "trigger_console_actions"
	ScheduledTasks                    = "scheduled_tasks"
	SecretScanTask                    = "task_secret_scan"
	MalwareScanTask                   = "task_malware_scan"
	ReportGeneratorTask               = "tasks_generate_report"
	ComputeThreatTask                 = "compute_threat"
	SendNotificationTask              = "tasks_send_notification"
	CloudComplianceTask               = "cloud_compliance"
	CachePostureProviders             = "cache_posture_providers"
	ReportCleanUpTask                 = "tasks_cleanup_reports"
	LinkCloudResourceTask             = "link_cloud_resource"
	LinkNodesTask                     = "link_nodes"
	StopSecretScanTask                = "task_stop_secret_scan"
	StopMalwareScanTask               = "task_stop_malware_scan"
	StopVulnerabilityScanTask         = "task_stop_vulnerability_scan"
	UpdateCloudResourceScanStatusTask = "update_cloud_resource_scan_status"
	UpdatePodScanStatusTask           = "update_pod_scan_status"
)

const (
	SCAN_STATUS_SUCCESS        = "COMPLETE"
	SCAN_STATUS_STARTING       = "STARTING"
	SCAN_STATUS_INPROGRESS     = "IN_PROGRESS"
	SCAN_STATUS_FAILED         = "ERROR"
	SCAN_STATUS_CANCEL_PENDING = "CANCEL_PENDING"
	SCAN_STATUS_CANCELLING     = "CANCELLING"
	SCAN_STATUS_CANCELLED      = "CANCELLED"
)

// Neo4j Node Labels
const (
	NodeTypeCloudProvider     = "CloudProvider"
	NodeTypeCloudRegion       = "CloudRegion"
	NodeTypeKubernetesCluster = "KubernetesCluster"
	NodeTypeContainerImage    = "ContainerImage"
	NodeTypeHost              = "Node"
	NodeTypeContainer         = "Container"
	NodeTypePod               = "Pod"
	NodeTypeProcess           = "Process"
	NodeTypeCloudNode         = "CloudNode"
	NodeTypeCloudResource     = "CloudResource"
	NodeTypeRegistryAccount   = "RegistryAccount"
)

type Neo4jScanType string

const (
	NEO4J_SECRET_SCAN           Neo4jScanType = "SecretScan"
	NEO4J_VULNERABILITY_SCAN    Neo4jScanType = "VulnerabilityScan"
	NEO4J_MALWARE_SCAN          Neo4jScanType = "MalwareScan"
	NEO4J_COMPLIANCE_SCAN       Neo4jScanType = "ComplianceScan"
	NEO4J_CLOUD_COMPLIANCE_SCAN Neo4jScanType = "CloudComplianceScan"
)

func StringToNeo4jScanType(s string) Neo4jScanType {
	switch s {
	case "VulnerabilityScan":
		return NEO4J_VULNERABILITY_SCAN
	case "SecretScan":
		return NEO4J_SECRET_SCAN
	case "MalwareScan":
		return NEO4J_MALWARE_SCAN
	case "ComplianceScan":
		return NEO4J_COMPLIANCE_SCAN
	case "CloudComplianceScan":
		return NEO4J_CLOUD_COMPLIANCE_SCAN
	default:
		return ""
	}
}

var (
	ScanTypeDetectedNode = map[Neo4jScanType]string{
		NEO4J_VULNERABILITY_SCAN:    "Vulnerability",
		NEO4J_SECRET_SCAN:           "Secret",
		NEO4J_MALWARE_SCAN:          "Malware",
		NEO4J_COMPLIANCE_SCAN:       "Compliance",
		NEO4J_CLOUD_COMPLIANCE_SCAN: "CloudCompliance",
	}
	DetectedNodeScanType = map[string]Neo4jScanType{
		"Vulnerability":   NEO4J_VULNERABILITY_SCAN,
		"Secret":          NEO4J_SECRET_SCAN,
		"Malware":         NEO4J_MALWARE_SCAN,
		"Compliance":      NEO4J_COMPLIANCE_SCAN,
		"CloudCompliance": NEO4J_CLOUD_COMPLIANCE_SCAN,
	}
)

type CloudProvider int

const (
	AWS CloudProvider = iota
	GCP
	Azure
	DO
	AWSOrg
	GCPOrg
)

func StringToCloudProvider(s string) CloudProvider {
	switch s {
	case "aws":
		return AWS
	case "aws_org":
		return AWSOrg
	case "gcp":
		return GCP
	case "azure":
		return Azure
	case "do":
		return DO
	case "gcp_org":
		return GCPOrg
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
	AUDIT_LOGS,
	CLOUD_RESOURCE,
}

// list of task names to create topics
var Tasks = []string{
	CleanUpGraphDBTask,
	CleanUpPostgresqlTask,
	CleanupDiagnosisLogs,
	RetryFailedScansTask,
	RetryFailedUpgradesTask,
	ScanSBOMTask,
	GenerateSBOMTask,
	CheckAgentUpgradeTask,
	SyncRegistryTask,
	TriggerConsoleActionsTask,
	ScheduledTasks,
	SecretScanTask,
	MalwareScanTask,
	ReportGeneratorTask,
	ComputeThreatTask,
	SendNotificationTask,
	CloudComplianceTask,
	CachePostureProviders,
	ReportCleanUpTask,
	LinkCloudResourceTask,
	LinkNodesTask,
	StopSecretScanTask,
	StopMalwareScanTask,
	StopVulnerabilityScanTask,
	UpdateCloudResourceScanStatusTask,
	UpdatePodScanStatusTask,
}

type ReportType string

const (
	ReportXLSX ReportType = "xlsx"
	ReportPDF  ReportType = "pdf"
)

const (
	MASK_GLOBAL        = "mask_global"
	MASK_ALL_IMAGE_TAG = "mask_all_image_tag"
	MASK_ENTITY        = "mask_entity"
	MASK_IMAGE_TAG     = "mask_image_tag"
)
