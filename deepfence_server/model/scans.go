package model

import (
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

type VulnerabilityScanConfig struct {
	ScanConfig string `json:"scan_config" required:"true" enum:"all,base,ruby,python,javascript,php,golang,java,rust,dotnet"`
}

type VulnerabilityScanTriggerReq struct {
	ScanTriggerCommon
	VulnerabilityScanConfig
}

type SecretScanTriggerReq struct {
	ScanTriggerCommon
}

type MalwareScanTriggerReq struct {
	ScanTriggerCommon
}

type ComplianceScanTriggerReq struct {
	ScanTriggerCommon
	ComplianceBenchmarkTypes
}

type KeyValues struct {
	Key    string   `json:"key" required:"true"`
	Values []string `json:"values" required:"true"`
}

type FieldsFilter struct {
	FieldsValues []KeyValues `json:"fields_values" required:"true"`
}

type ScanFilter struct {
	ImageScanFilter             FieldsFilter `json:"image_scan_filter" required:"true"`
	ContainerScanFilter         FieldsFilter `json:"container_scan_filter" required:"true"`
	HostScanFilter              FieldsFilter `json:"host_scan_filter" required:"true"`
	CloudAccountScanFilter      FieldsFilter `json:"cloud_account_scan_filter" required:"true"`
	KubernetesClusterScanFilter FieldsFilter `json:"kubernetes_cluster_scan_filter" required:"true"`
}

type ScanTriggerCommon struct {
	NodeIds []NodeIdentifier `json:"node_ids" required:"true"`
	Filters ScanFilter       `json:"filters" required:"true"`
}

type NodeIdentifier struct {
	NodeId   string `json:"node_id" required:"true"`
	NodeType string `json:"node_type" required:"true" enum:"image,host,container,cloud_account,cluster,registry"`
}

type ComplianceBenchmarkTypes struct {
	BenchmarkTypes []string `json:"benchmark_types" required:"true"`
}

type ScanStatus string

type ScanInfo struct {
	ScanId    string `json:"scan_id" required:"true"`
	Status    string `json:"status" required:"true"`
	UpdatedAt int64  `json:"updated_at" required:"true" format:"int64"`
	NodeId    string `json:"node_id" required:"true"`
	NodeType  string `json:"node_type" required:"true"`
}

type CloudComplianceScanInfo struct {
	ScanId        string `json:"scan_id" required:"true"`
	BenchmarkType string `json:"benchmark_type" required:"true"`
	Status        string `json:"status" required:"true"`
	UpdatedAt     int64  `json:"updated_at" required:"true" format:"int64"`
}

const (
	SCAN_STATUS_SUCCESS    = utils.SCAN_STATUS_SUCCESS
	SCAN_STATUS_STARTING   = utils.SCAN_STATUS_STARTING
	SCAN_STATUS_INPROGRESS = utils.SCAN_STATUS_INPROGRESS
)

type ScanTriggerResp struct {
	ScanIds    []string `json:"scan_ids" required:"true"`
	BulkScanId string   `json:"bulk_scan_id" required:"true"`
}

type ScanStatusReq struct {
	ScanIds    []string `query:"scan_ids" form:"scan_ids" required:"true"`
	BulkScanId string   `query:"bulk_scan_id" form:"bulk_scan_id" required:"true"`
}

type ScanStatusResp struct {
	Statuses map[string]ScanInfo `json:"statuses" required:"true"`
}

type ComplianceScanStatusResp struct {
	Statuses []ComplianceScanStatus `json:"statuses" required:"true"`
}

type ComplianceScanStatus struct {
	ScanId        string `json:"scan_id"`
	BenchmarkType string `json:"benchmark_type"`
	Status        string `json:"status"`
}

type ScanListReq struct {
	NodeId   string      `json:"node_id" required:"true"`
	NodeType string      `json:"node_type" required:"true" enum:"image,host,container"`
	Window   FetchWindow `json:"window"  required:"true"`
}

type ScanListResp struct {
	ScansInfo []ScanInfo `json:"scans_info" required:"true"`
}

type CloudComplianceScanListResp struct {
	ScansInfo []CloudComplianceScanInfo `json:"scans_info" required:"true"`
}

type ScanResultsReq struct {
	ScanId string      `json:"scan_id" required:"true"`
	Window FetchWindow `json:"window"  required:"true"`
}

type ScanResultsCommon struct {
	ContainerName         string `json:"docker_container_name" required:"true"`
	ImageName             string `json:"docker_image_name" required:"true"`
	HostName              string `json:"host_name" required:"true"`
	KubernetesClusterName string `json:"kubernetes_cluster_name" required:"true"`
	NodeID                string `json:"node_id" required:"true"`
	NodeName              string `json:"node_name" required:"true"`
	NodeType              string `json:"node_type" required:"true"`
	ScanID                string `json:"scan_id" required:"true"`
}

type SecretScanResult struct {
	ScanResultsCommon
	Secrets        []Secret       `json:"secrets" required:"true"`
	Rules          []Rule         `json:"rules" required:"true"`
	RuleSecrets    map[int][]int  `json:"rule_2_secrets" required:"true"`
	SeverityCounts map[string]int `json:"severity_counts" required:"true"`
}

type VulnerabilityScanResult struct {
	ScanResultsCommon
	Vulnerabilities []Vulnerability `json:"vulnerabilities" required:"true" required:"true"`
	SeverityCounts  map[string]int  `json:"severity_counts" required:"true"`
}

type MalwareScanResult struct {
	ScanResultsCommon
	Malwares       []Malware      `json:"malwares" required:"true"`
	SeverityCounts map[string]int `json:"severity_counts" required:"true"`
}

type ComplianceScanResult struct {
	ScanResultsCommon
	Compliances []Compliance `json:"compliances" required:"true"`
}

type Secret struct {
	StartingIndex         int    `json:"starting_index" required:"true"`
	RelativeStartingIndex int    `json:"relative_starting_index" required:"true"`
	RelativeEndingIndex   int    `json:"relative_ending_index" required:"true"`
	FullFilename          string `json:"full_filename" required:"true"`
	MatchedContent        string `json:"matched_content" required:"true"`
}

type Rule struct {
	ID               int     `json:"id" required:"true" required:"true"`
	Name             string  `json:"name" required:"true"`
	Part             string  `json:"part" required:"true"`
	SignatureToMatch string  `json:"signature_to_match" required:"true"`
	Level            string  `json:"level" required:"true"`
	Score            float64 `json:"score" required:"true"`
}

type Vulnerability struct {
	Cve_id                     string   `json:"cve_id" required:"true"`
	Cve_type                   string   `json:"cve_type" required:"true"`
	Cve_severity               string   `json:"cve_severity" required:"true"`
	Cve_caused_by_package      string   `json:"cve_caused_by_package" required:"true"`
	Cve_caused_by_package_path string   `json:"cve_caused_by_package_path" required:"true"`
	Cve_container_layer        string   `json:"cve_container_layer" required:"true"`
	Cve_fixed_in               string   `json:"cve_fixed_in" required:"true"`
	Cve_link                   string   `json:"cve_link" required:"true"`
	Cve_description            string   `json:"cve_description" required:"true"`
	Cve_cvss_score             float64  `json:"cve_cvss_score" required:"true"`
	Cve_overall_score          float64  `json:"cve_overall_score" required:"true"`
	Cve_attack_vector          string   `json:"cve_attack_vector" required:"true"`
	URLs                       []string `json:"urls" required:"true"`
	ExploitPOC                 string   `json:"exploit_poc" required:"true"`
}

type Malware struct {
	ImageLayerID     string            `json:"ImageLayerId,omitempty" required:"true"`
	Class            string            `json:"Class,omitempty" required:"true"`
	CompleteFilename string            `json:"CompleteFilename,omitempty,omitempty" required:"true"`
	FileSevScore     float64           `json:"FileSevScore,omitempty" required:"true"`
	FileSeverity     string            `json:"FileSeverity,omitempty" required:"true"`
	SeverityScore    float64           `json:"SeverityScore,omitempty" required:"true"`
	Meta             []string          `json:"Meta,omitempty" required:"true"`
	MetaRules        map[string]string `json:"Meta Rules,omitempty" required:"true"`
	Summary          string            `json:"Summary,omitempty" required:"true"`
	RuleName         string            `json:"RuleName,omitempty" required:"true"`
	StringsToMatch   []string          `json:"StringsToMatch,omitempty" required:"true"`
}

type Compliance struct {
	TestCategory        string `json:"test_category" required:"true"`
	TestNumber          string `json:"test_number" required:"true"`
	TestInfo            string `json:"description" required:"true"`
	RemediationScript   string `json:"remediation_script,omitempty" required:"true"`
	RemediationAnsible  string `json:"remediation_ansible,omitempty" required:"true"`
	RemediationPuppet   string `json:"remediation_puppet,omitempty" required:"true"`
	Resource            string `json:"resource" required:"true"`
	TestRationale       string `json:"test_rationale" required:"true"`
	TestSeverity        string `json:"test_severity" required:"true"`
	TestDesc            string `json:"test_desc" required:"true"`
	Status              string `json:"status" required:"true"`
	ComplianceCheckType string `json:"compliance_check_type" required:"true"`
	ComplianceNodeType  string `json:"compliance_node_type" required:"true"`
}
