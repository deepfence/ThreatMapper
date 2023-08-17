package ingesters

import (
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

var (
	ScanStatusField = map[utils.Neo4jScanType]string{
		utils.NEO4J_SECRET_SCAN:           "secret_scan_status",
		utils.NEO4J_VULNERABILITY_SCAN:    "vulnerability_scan_status",
		utils.NEO4J_MALWARE_SCAN:          "malware_scan_status",
		utils.NEO4J_COMPLIANCE_SCAN:       "compliance_scan_status",
		utils.NEO4J_CLOUD_COMPLIANCE_SCAN: "cloud_compliance_scan_status",
	}

	LatestScanIdField = map[utils.Neo4jScanType]string{
		utils.NEO4J_SECRET_SCAN:           "secret_latest_scan_id",
		utils.NEO4J_VULNERABILITY_SCAN:    "vulnerability_latest_scan_id",
		utils.NEO4J_MALWARE_SCAN:          "malware_latest_scan_id",
		utils.NEO4J_COMPLIANCE_SCAN:       "compliance_latest_scan_id",
		utils.NEO4J_CLOUD_COMPLIANCE_SCAN: "cloud_compliance_latest_scan_id",
	}

	ScanCountField = map[utils.Neo4jScanType]string{
		utils.NEO4J_SECRET_SCAN:           "secrets_count",
		utils.NEO4J_VULNERABILITY_SCAN:    "vulnerabilities_count",
		utils.NEO4J_MALWARE_SCAN:          "malwares_count",
		utils.NEO4J_COMPLIANCE_SCAN:       "compliances_count",
		utils.NEO4J_CLOUD_COMPLIANCE_SCAN: "cloud_compliances_count",
	}
)
