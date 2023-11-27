package ingesters

import (
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

var (
	ScanStatusField = map[utils.Neo4jScanType]string{
		utils.NEO4JSecretScan:          "secret_scan_status",
		utils.NEO4JVulnerabilityScan:   "vulnerability_scan_status",
		utils.NEO4JMalwareScan:         "malware_scan_status",
		utils.NEO4JComplianceScan:      "compliance_scan_status",
		utils.NEO4JCloudComplianceScan: "cloud_compliance_scan_status",
	}

	LatestScanIDField = map[utils.Neo4jScanType]string{
		utils.NEO4JSecretScan:          "secret_latest_scan_id",
		utils.NEO4JVulnerabilityScan:   "vulnerability_latest_scan_id",
		utils.NEO4JMalwareScan:         "malware_latest_scan_id",
		utils.NEO4JComplianceScan:      "compliance_latest_scan_id",
		utils.NEO4JCloudComplianceScan: "cloud_compliance_latest_scan_id",
	}

	ScanCountField = map[utils.Neo4jScanType]string{
		utils.NEO4JSecretScan:          "secrets_count",
		utils.NEO4JVulnerabilityScan:   "vulnerabilities_count",
		utils.NEO4JMalwareScan:         "malwares_count",
		utils.NEO4JComplianceScan:      "compliances_count",
		utils.NEO4JCloudComplianceScan: "cloud_compliances_count",
	}
)
