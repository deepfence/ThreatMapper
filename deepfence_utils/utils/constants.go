package utils

import (
	"time"
)

const (
	Project           = "ThreatMapper"
	ErrorUserNotFound = "user not found"
)

// kafka topics
const (
	AuditLogs                 = "audit-logs"
	VulnerabilityScan         = "vulnerability-scan"
	VulnerabilityScanStatus   = "vulnerability-scan-status"
	SecretScan                = "secret-scan"
	SecretScanStatus          = "secret-scan-status"
	MalwareScan               = "malware-scan"
	MalwareScanStatus         = "malware-scan-status"
	SbomArtifacts             = "sbom-artifact"
	SbomCVEScan               = "sbom-cve-scan"
	CloudComplianceScan       = "cloud-compliance-scan"
	CloudComplianceScanStatus = "cloud-compliance-scan-status"
	ComplianceScan            = "compliance-scan"
	ComplianceScanStatus      = "compliance-scan-status"
	CloudTrailAlerts          = "cloudtrail-alert"
	CloudResource             = "cloud-resource"
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
	CheckCloudScannerAgentUpgradeTask = "tasks_check_cloud_scanner_agent_upgrade"
	SyncRegistryTask                  = "task_sync_registry"
	SyncRegistryPostgresNeo4jTask     = "task_sync_registry_postgres_neo4j"
	TriggerConsoleActionsTask         = "trigger_console_actions"
	ScheduledTasks                    = "scheduled_tasks"
	SecretScanTask                    = "task_secret_scan"
	MalwareScanTask                   = "task_malware_scan"
	ReportGeneratorTask               = "tasks_generate_report"
	ComputeThreatTask                 = "compute_threat"
	SendNotificationTask              = "tasks_send_notification"
	CloudComplianceControlsTask       = "cloud_compliance_controls"
	CachePostureProviders             = "cache_posture_providers"
	ReportCleanUpTask                 = "tasks_cleanup_reports"
	LinkCloudResourceTask             = "link_cloud_resource"
	LinkNodesTask                     = "link_nodes"
	StopSecretScanTask                = "task_stop_secret_scan"
	StopMalwareScanTask               = "task_stop_malware_scan"
	StopVulnerabilityScanTask         = "task_stop_vulnerability_scan"
	UpdateCloudResourceScanStatusTask = "update_cloud_resource_scan_status"
	UpdatePodScanStatusTask           = "update_pod_scan_status"
	BulkDeleteScans                   = "bulk_delete_scans"
	AutoFetchGenerativeAIIntegrations = "auto_fetch_generative_ai_integrations"
	AsynqDeleteAllArchivedTasks       = "asynq_delete_all_archived_tasks"
	RedisRewriteAOF                   = "redis_rewrite_aof"
	DeleteCloudAccounts               = "delete_cloud_accounts"

	UpdateLicenseTask      = "update_license"
	ReportLicenseUsageTask = "report_license_usage"

	ThreatIntelUpdateTask = "threat_intel_update"
)

const (
	ReportRetentionTime     = 24 * time.Hour
	ReportGenerationTimeout = 30 * time.Minute
	ReportRecordsMax        = 100000
)

const (
	ScanStatusSuccess       = "COMPLETE"
	ScanStatusStarting      = "STARTING"
	ScanStatusInProgress    = "IN_PROGRESS"
	ScanStatusFailed        = "ERROR"
	ScanStatusCancelPending = "CANCEL_PENDING"
	ScanStatusCancelling    = "CANCELLING"
	ScanStatusCancelled     = "CANCELLED"
	ScanStatusDeletePending = "DELETE_PENDING"
)

const (
	ScanRetryFailedStatusMessage = "scan failed to complete, please check agent logs"
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
	NEO4JSecretScan          Neo4jScanType = "SecretScan"
	NEO4JVulnerabilityScan   Neo4jScanType = "VulnerabilityScan"
	NEO4JMalwareScan         Neo4jScanType = "MalwareScan"
	NEO4JComplianceScan      Neo4jScanType = "ComplianceScan"
	NEO4JCloudComplianceScan Neo4jScanType = "CloudComplianceScan"
)

func StringToNeo4jScanType(s string) Neo4jScanType {
	switch s {
	case "VulnerabilityScan":
		return NEO4JVulnerabilityScan
	case "SecretScan":
		return NEO4JSecretScan
	case "MalwareScan":
		return NEO4JMalwareScan
	case "ComplianceScan":
		return NEO4JComplianceScan
	case "CloudComplianceScan":
		return NEO4JCloudComplianceScan
	default:
		return ""
	}
}

var (
	ScanTypeDetectedNode = map[Neo4jScanType]string{
		NEO4JVulnerabilityScan:   "Vulnerability",
		NEO4JSecretScan:          "Secret",
		NEO4JMalwareScan:         "Malware",
		NEO4JComplianceScan:      "Compliance",
		NEO4JCloudComplianceScan: "CloudCompliance",
	}
	DetectedNodeScanType = map[string]Neo4jScanType{
		"Vulnerability":   NEO4JVulnerabilityScan,
		"Secret":          NEO4JSecretScan,
		"Malware":         NEO4JMalwareScan,
		"Compliance":      NEO4JComplianceScan,
		"CloudCompliance": NEO4JCloudComplianceScan,
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
	VulnerabilityScan, VulnerabilityScanStatus,
	SecretScan, SecretScanStatus,
	MalwareScan, MalwareScanStatus,
	SbomArtifacts, SbomCVEScan,
	CloudComplianceScan, CloudComplianceScanStatus,
	ComplianceScan, ComplianceScanStatus,
	CloudTrailAlerts,
	AuditLogs,
	CloudResource,
}

// Tasks is a list of task names to create topics
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
	CloudComplianceControlsTask,
	CachePostureProviders,
	ReportCleanUpTask,
	LinkCloudResourceTask,
	LinkNodesTask,
	StopSecretScanTask,
	StopMalwareScanTask,
	StopVulnerabilityScanTask,
	UpdateCloudResourceScanStatusTask,
	UpdatePodScanStatusTask,

	UpdateLicenseTask,
	ReportLicenseUsageTask,

	ThreatIntelUpdateTask,
}

type ReportType string

const (
	ReportXLSX ReportType = "xlsx"
	ReportPDF  ReportType = "pdf"
	ReportSBOM ReportType = "sbom"
)

// mask_global : This is to mask gobally. (same as previous mask_across_hosts_and_images flag)
// mask_all_image_tag: This is to mask for all tags of an image.
// mask_entity: This is to mask for an entity other than container/container image. E.g. Host.
// mask_image_tag: This is to apply mask for an image and tag.
const (
	MaskGlobal      = "mask_global"
	MaskAllImageTag = "mask_all_image_tag"
	MaskEntity      = "mask_entity"
	MaskImageTag    = "mask_image_tag"
)

const (
	FileServerURLSettingLabel       = "Console File Server URL"
	FileServerURLSettingDescription = "Serve threat intel feeds to agents. If agents are connected using a different URL than Console URL, please change this"
)

const (
	FileServerPathAgentBinary = "agent-binary"
)
