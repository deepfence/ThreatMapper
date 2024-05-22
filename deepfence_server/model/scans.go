package model

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
)

type VulnerabilityScanConfigLanguage struct {
	Language string `json:"language" validate:"required,oneof=base ruby python javascript php golang golang-binary java rust rust-binary dotnet" required:"true" enum:"base,ruby,python,javascript,php,golang,golang-binary,java,rust,rust-binary,dotnet"`
}

type VulnerabilityScanConfig struct {
	ScanConfigLanguages []VulnerabilityScanConfigLanguage `json:"scan_config" validate:"required,min=1" required:"true"`
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

type ScanCompareReq struct {
	BaseScanID   string                  `json:"base_scan_id" required:"true"`
	ToScanID     string                  `json:"to_scan_id" required:"true"`
	FieldsFilter reporters.FieldsFilters `json:"fields_filter" required:"true"`
	Window       FetchWindow             `json:"window"  required:"true"`
}

type ScanCompareRes[T any] struct {
	New []T `json:"new" required:"true"`
}

type ScanCompareResVulnerability = ScanCompareRes[Vulnerability]
type ScanCompareResSecret = ScanCompareRes[Secret]
type ScanCompareResMalware = ScanCompareRes[Malware]
type ScanCompareResCompliance = ScanCompareRes[Compliance]
type ScanCompareResCloudCompliance = ScanCompareRes[CloudCompliance]

type ScanFilter struct {
	ImageScanFilter             reporters.ContainsFilter `json:"image_scan_filter" required:"true"`
	ContainerScanFilter         reporters.ContainsFilter `json:"container_scan_filter" required:"true"`
	HostScanFilter              reporters.ContainsFilter `json:"host_scan_filter" required:"true"`
	CloudAccountScanFilter      reporters.ContainsFilter `json:"cloud_account_scan_filter" required:"true"`
	KubernetesClusterScanFilter reporters.ContainsFilter `json:"kubernetes_cluster_scan_filter" required:"true"`
}

type ScanTriggerCommon struct {
	NodeIDs             []NodeIdentifier `json:"node_ids" required:"true"`
	Filters             ScanFilter       `json:"filters" required:"true"`
	IsPriority          bool             `json:"is_priority"`
	DeepfenceSystemScan bool             `json:"deepfence_system_scan"` // Scan Deepfence images/containers/pods if present in NodeIDs
}

type NodeIdentifier struct {
	NodeID   string `json:"node_id" required:"true"`
	NodeType string `json:"node_type" required:"true" enum:"image,host,container,cloud_account,cluster,registry,pod"`
}

type ComplianceBenchmarkTypes struct {
	BenchmarkTypes []string `json:"benchmark_types" required:"true"`
}

type ScanStatus string

type ScanInfo struct {
	ScanID         string           `json:"scan_id" required:"true"`
	Status         string           `json:"status" required:"true"`
	StatusMessage  string           `json:"status_message" required:"true"`
	UpdatedAt      int64            `json:"updated_at" required:"true" format:"int64"`
	CreatedAt      int64            `json:"created_at" required:"true" format:"int64"`
	NodeID         string           `json:"node_id" required:"true"`
	NodeType       string           `json:"node_type" required:"true"`
	SeverityCounts map[string]int32 `json:"severity_counts" required:"true"`
	NodeName       string           `json:"node_name" required:"true"`
}

type ComplianceScanInfo struct {
	ScanInfo
	BenchmarkTypes []string `json:"benchmark_types" required:"true"`
	CloudProvider  string   `json:"cloud_provider" required:"true"`
}

type ScanTriggerResp struct {
	ScanIds    []string `json:"scan_ids" required:"true"`
	BulkScanID string   `json:"bulk_scan_id" required:"true"`
}

type ScanStatusReq struct {
	ScanIds    []string `json:"scan_ids" required:"true"`
	BulkScanID string   `json:"bulk_scan_id" required:"true"`
}

type ScanStatusResp struct {
	Statuses map[string]ScanInfo `json:"statuses" required:"true"`
}

type ComplianceScanStatusResp struct {
	Statuses []ComplianceScanInfo `json:"statuses" required:"true"`
}

type ScanListReq struct {
	NodeIds      []NodeIdentifier        `json:"node_ids" required:"true"`
	FieldsFilter reporters.FieldsFilters `json:"fields_filter" required:"true"`
	Window       FetchWindow             `json:"window"  required:"true"`
}

type ScanListResp struct {
	ScansInfo []ScanInfo `json:"scans_info" required:"true"`
}

type CloudComplianceScanListResp struct {
	ScansInfo []ComplianceScanInfo `json:"scans_info" required:"true"`
}

type ScanResultsMaskRequest struct {
	ScanID     string   `json:"scan_id" validate:"required" required:"true"`
	ResultIDs  []string `json:"result_ids" validate:"required,gt=0,dive,min=1" required:"true"`
	ScanType   string   `json:"scan_type" validate:"required,oneof=SecretScan VulnerabilityScan MalwareScan ComplianceScan CloudComplianceScan" required:"true" enum:"SecretScan,VulnerabilityScan,MalwareScan,ComplianceScan,CloudComplianceScan"`
	MaskAction string   `json:"mask_action" validate:"required,oneof=mask_global mask_all_image_tag mask_entity mask_image_tag" required:"true" enum:"mask_global,mask_all_image_tag,mask_entity,mask_image_tag"`
}

type ScanResultsActionRequest struct {
	ScanID           string   `json:"scan_id" validate:"required" required:"true"`
	ResultIDs        []string `json:"result_ids" validate:"required,gt=0,dive,min=1" required:"true"`
	ScanType         string   `json:"scan_type" validate:"required,oneof=SecretScan VulnerabilityScan MalwareScan ComplianceScan CloudComplianceScan" required:"true" enum:"SecretScan,VulnerabilityScan,MalwareScan,ComplianceScan,CloudComplianceScan"`
	NotifyIndividual bool     `json:"notify_individual"`
	IntegrationIDs   []int32  `json:"integration_ids"`
}

type DownloadReportResponse struct {
	URLLink string `json:"url_link"`
}

type DownloadScanResultsResponse struct {
	ScanInfo    ScanResultsCommon `json:"scan_info"`
	ScanResults []interface{}     `json:"scan_results"`
}

type BulkDeleteScansRequest struct {
	ScanType string                  `json:"scan_type" validate:"required,oneof=Secret Vulnerability Malware Compliance CloudCompliance" required:"true" enum:"Secret,Vulnerability,Malware,Compliance,CloudCompliance"`
	Filters  reporters.FieldsFilters `json:"filters" required:"true"`
}

type StopScanRequest struct {
	ScanIds  []string `json:"scan_ids" validate:"required" required:"true"`
	ScanType string   `json:"scan_type" validate:"required,oneof=SecretScan VulnerabilityScan MalwareScan ComplianceScan CloudComplianceScan" required:"true" enum:"SecretScan,VulnerabilityScan,MalwareScan,ComplianceScan,CloudComplianceScan"`
}

type ScanActionRequest struct {
	ScanID   string `path:"scan_id" validate:"required" required:"true"`
	ScanType string `path:"scan_type" validate:"required,oneof=SecretScan VulnerabilityScan MalwareScan ComplianceScan CloudComplianceScan" required:"true" enum:"SecretScan,VulnerabilityScan,MalwareScan,ComplianceScan,CloudComplianceScan"`
	// utils.Neo4jScanType
}

type NodesInScanResultRequest struct {
	ResultIDs []string `json:"result_ids" validate:"required,dive,min=1" required:"true"`
	ScanType  string   `json:"scan_type" validate:"required,oneof=SecretScan VulnerabilityScan MalwareScan ComplianceScan CloudComplianceScan" required:"true" enum:"SecretScan,VulnerabilityScan,MalwareScan,ComplianceScan,CloudComplianceScan"`
}

type ScanResultBasicNode struct {
	ResultID   string      `json:"result_id" required:"true"`
	BasicNodes []BasicNode `json:"basic_nodes" required:"true"`
}

type SbomRequest struct {
	// either scan_id or node_id+node_type is required
	ScanID string `json:"scan_id" validate:"required" required:"true"`
	// NodeID   string `json:"node_id"`
	// NodeType string `json:"node_type"`
}

type SbomResponse struct {
	PackageName string   `json:"package_name,omitempty"`
	Version     string   `json:"version,omitempty"`
	Locations   []string `json:"locations,omitempty"`
	Licenses    []string `json:"licenses,omitempty"`
	CveID       string   `json:"cve_id,omitempty"`
	Severity    string   `json:"severity,omitempty"`
	CveNodeID   string   `json:"cve_node_id,omitempty"`
}

type ScanResultsReq struct {
	ScanID       string                  `json:"scan_id" required:"true"`
	FieldsFilter reporters.FieldsFilters `json:"fields_filter" required:"true"`
	Window       FetchWindow             `json:"window"  required:"true"`
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
	UpdatedAt             int64  `json:"updated_at" required:"true" format:"int64"`
	CreatedAt             int64  `json:"created_at" required:"true" format:"int64"`
	CloudAccountID        string `json:"cloud_account_id" required:"true"`
}

type FiltersReq struct {
	RequiredFilters []string               `json:"filters" required:"true"`
	Having          map[string]interface{} `json:"having"`
}

type FiltersResult struct {
	Filters map[string][]string `json:"filters" required:"true"`
}

type SecretScanResult struct {
	ScanResultsCommon
	Secrets        []Secret         `json:"secrets" required:"true"`
	SeverityCounts map[string]int32 `json:"severity_counts" required:"true"`
}

type SecretScanResultRules struct {
	Rules []string `json:"rules" required:"true"`
}

type VulnerabilityScanResult struct {
	ScanResultsCommon
	Vulnerabilities []Vulnerability  `json:"vulnerabilities" required:"true"`
	SeverityCounts  map[string]int32 `json:"severity_counts" required:"true"`
}

type MalwareScanResult struct {
	ScanResultsCommon
	Malwares       []Malware        `json:"malwares" required:"true"`
	SeverityCounts map[string]int32 `json:"severity_counts" required:"true"`
}

type MalwareScanResultRules struct {
	Rules []string `json:"rules" required:"true"`
}

type MalwareScanResultClass struct {
	Class []string `json:"class" required:"true"`
}

type ComplianceScanResult struct {
	ScanResultsCommon
	ComplianceAdditionalInfo
	Compliances []Compliance `json:"compliances" required:"true"`
}

type ComplianceAdditionalInfo struct {
	BenchmarkTypes       []string         `json:"benchmark_type" required:"true"`
	StatusCounts         map[string]int32 `json:"status_counts" required:"true"`
	CompliancePercentage float64          `json:"compliance_percentage" required:"true"`
}

type CloudComplianceScanResult struct {
	ScanResultsCommon
	ComplianceAdditionalInfo
	Compliances []CloudCompliance `json:"compliances" required:"true"`
}

type Secret struct {
	// Secret + Rule neo4j node
	NodeID                string      `json:"node_id" required:"true"`
	StartingIndex         int32       `json:"starting_index" required:"true"`
	RelativeStartingIndex int32       `json:"relative_starting_index" required:"true"`
	RelativeEndingIndex   int32       `json:"relative_ending_index" required:"true"`
	FullFilename          string      `json:"full_filename" required:"true"`
	MatchedContent        string      `json:"matched_content" required:"true"`
	Masked                bool        `json:"masked" required:"true"`
	UpdatedAt             int64       `json:"updated_at" required:"true"`
	Level                 string      `json:"level" required:"true"`
	Score                 float64     `json:"score" required:"true"`
	RuleID                int32       `json:"rule_id" required:"true"`
	Name                  string      `json:"name" required:"true"`
	Part                  string      `json:"part" required:"true"`
	SignatureToMatch      string      `json:"signature_to_match" required:"true"`
	Resources             []BasicNode `json:"resources" required:"false"`
}

func (Secret) NodeType() string {
	return "Secret"
}

func (Secret) ExtendedField() string {
	return "rule_id"
}

func (v Secret) GetCategory() string {
	return v.Level
}

func (Secret) GetJSONCategory() string {
	return "level"
}

type SecretRule struct {
	ID               int    `json:"id"`
	Name             string `json:"name"`
	Part             string `json:"part"`
	SignatureToMatch string `json:"signature_to_match"`
	Level            string `json:"level" required:"true"`
	Masked           bool   `json:"masked" required:"true"`
	UpdatedAt        int64  `json:"updated_at" required:"true"`
}

func (SecretRule) NodeType() string {
	return "SecretRule"
}

func (SecretRule) ExtendedField() string {
	return ""
}

func (v SecretRule) GetCategory() string {
	return v.Level
}

func (SecretRule) GetJSONCategory() string {
	return "level"
}

type Vulnerability struct {
	NodeID                 string        `json:"node_id" required:"true"`
	CveID                  string        `json:"cve_id" required:"true"`
	CveSeverity            string        `json:"cve_severity" required:"true"`
	CveCausedByPackage     string        `json:"cve_caused_by_package" required:"true"`
	CveCausedByPackagePath string        `json:"cve_caused_by_package_path" required:"true"`
	CveContainerLayer      string        `json:"cve_container_layer" required:"true"`
	CveLink                string        `json:"cve_link" required:"true"`
	Masked                 bool          `json:"masked" required:"true"`
	UpdatedAt              int64         `json:"updated_at" required:"true"`
	HasLiveConnection      bool          `json:"has_live_connection" required:"true"`
	CveType                string        `json:"cve_type" required:"true"`
	CveFixedIn             string        `json:"cve_fixed_in" required:"true"`
	CveDescription         string        `json:"cve_description" required:"true"`
	CveCVSSScore           float64       `json:"cve_cvss_score" required:"true"`
	CveOverallScore        float64       `json:"cve_overall_score" required:"true"`
	CveAttackVector        string        `json:"cve_attack_vector" required:"true"`
	URLs                   []interface{} `json:"urls" required:"true"`
	ExploitPOC             string        `json:"exploit_poc" required:"true"`
	ParsedAttackVector     string        `json:"parsed_attack_vector" required:"true"`
	Resources              []BasicNode   `json:"resources" required:"false"`
	RuleID                 string        `json:"rule_id" required:"true"`
}

func (Vulnerability) NodeType() string {
	return "Vulnerability"
}

func (Vulnerability) ExtendedField() string {
	return "rule_id"
}

func (v Vulnerability) GetCategory() string {
	return v.CveSeverity
}

func (Vulnerability) GetJSONCategory() string {
	return "cve_severity"
}

type VulnerabilityRule struct {
	NodeID             string        `json:"node_id" required:"true"`
	CveID              string        `json:"cve_id" required:"true"`
	CveType            string        `json:"cve_type" required:"true"`
	CveSeverity        string        `json:"cve_severity" required:"true"`
	CveFixedIn         string        `json:"cve_fixed_in" required:"true"`
	CveLink            string        `json:"cve_link" required:"true"`
	CveDescription     string        `json:"cve_description" required:"true"`
	CveCVSSScore       float64       `json:"cve_cvss_score" required:"true"`
	CveOverallScore    float64       `json:"cve_overall_score" required:"true"`
	CveAttackVector    string        `json:"cve_attack_vector" required:"true"`
	URLs               []interface{} `json:"urls" required:"true"`
	ExploitPOC         string        `json:"exploit_poc" required:"true"`
	Masked             bool          `json:"masked" required:"true"`
	UpdatedAt          int64         `json:"updated_at" required:"true"`
	ParsedAttackVector string        `json:"parsed_attack_vector" required:"true"`
	Resources          []BasicNode   `json:"resources" required:"false"`
}

func (VulnerabilityRule) NodeType() string {
	return "VulnerabilityStub"
}

func (VulnerabilityRule) ExtendedField() string {
	return ""
}

func (v VulnerabilityRule) GetCategory() string {
	return v.CveSeverity
}

func (VulnerabilityRule) GetJSONCategory() string {
	return "cve_severity"
}

type Malware struct {
	// Malware + MalwareRule node in neo4j
	Class            string        `json:"class" required:"true"`
	CompleteFilename string        `json:"complete_filename" required:"true"`
	FileSevScore     int           `json:"file_sev_score" required:"true"`
	FileSeverity     string        `json:"file_severity" required:"true"`
	ImageLayerID     string        `json:"image_layer_id" required:"true"`
	NodeID           string        `json:"node_id" required:"true"`
	RuleID           string        `json:"rule_id" required:"true"`
	RuleName         string        `json:"rule_name" required:"true"`
	Author           string        `json:"author"`
	Date             string        `json:"date"`
	Description      string        `json:"description"`
	Filetype         string        `json:"filetype"`
	Info             string        `json:"info"`
	Version          string        `json:"version"`
	SeverityScore    int           `json:"severity_score"`
	StringsToMatch   []interface{} `json:"strings_to_match"`
	Summary          string        `json:"summary"`
	Masked           bool          `json:"masked" required:"true"`
	Resources        []BasicNode   `json:"resources" required:"false"`
}

func (Malware) NodeType() string {
	return "Malware"
}

func (Malware) ExtendedField() string {
	return "rule_id"
}

func (v Malware) GetCategory() string {
	return v.FileSeverity
}

func (Malware) GetJSONCategory() string {
	return "file_severity"
}

type MalwareRule struct {
	RuleID       string `json:"rule_id"`
	RuleName     string `json:"rule_name"`
	Author       string `json:"author"`
	Date         string `json:"date"`
	Description  string `json:"description"`
	Filetype     string `json:"filetype"`
	Info         string `json:"info"`
	Version      string `json:"version"`
	Reference    string `json:"reference"`
	FileSeverity string `json:"file_severity"`
	Masked       bool   `json:"masked" required:"true"`
	UpdatedAt    int64  `json:"updated_at" required:"true"`
}

func (MalwareRule) NodeType() string {
	return "MalwareRule"
}

func (MalwareRule) ExtendedField() string {
	return ""
}

func (v MalwareRule) GetCategory() string {
	return v.FileSeverity
}

func (MalwareRule) GetJSONCategory() string {
	return "file_severity"
}

type Compliance struct {
	TestCategory        string      `json:"test_category" required:"true"`
	TestNumber          string      `json:"test_number" required:"true"`
	TestInfo            string      `json:"description" required:"true"`
	RemediationScript   string      `json:"remediation_script,omitempty" required:"true"`
	RemediationAnsible  string      `json:"remediation_ansible,omitempty" required:"true"`
	RemediationPuppet   string      `json:"remediation_puppet,omitempty" required:"true"`
	Resource            string      `json:"resource" required:"true"`
	TestRationale       string      `json:"test_rationale" required:"true"`
	TestSeverity        string      `json:"test_severity" required:"true"`
	TestDesc            string      `json:"test_desc" required:"true"`
	Status              string      `json:"status" required:"true"`
	ComplianceCheckType string      `json:"compliance_check_type" required:"true"`
	ComplianceNodeID    string      `json:"node_id" required:"true"`
	ComplianceNodeType  string      `json:"node_type" required:"true"`
	Masked              bool        `json:"masked" required:"true"`
	UpdatedAt           int64       `json:"updated_at" required:"true"`
	Resources           []BasicNode `json:"resources" required:"false"`
	RuleID              string      `json:"rule_id" required:"true"`
}

func (Compliance) NodeType() string {
	return "Compliance"
}

func (Compliance) ExtendedField() string {
	return "rule_id"
}

func (v Compliance) GetCategory() string {
	return v.TestSeverity
}

func (Compliance) GetJSONCategory() string {
	return "test_severity"
}

type ComplianceRule struct {
	TestCategory  string `json:"test_category" required:"true"`
	TestNumber    string `json:"test_number" required:"true"`
	TestInfo      string `json:"description" required:"true"`
	TestRationale string `json:"test_rationale" required:"true"`
	TestSeverity  string `json:"test_severity" required:"true"`
	TestDesc      string `json:"test_desc" required:"true"`
	Masked        bool   `json:"masked" required:"true"`
	UpdatedAt     int64  `json:"updated_at" required:"true"`
}

func (ComplianceRule) NodeType() string {
	return "ComplianceRule"
}

func (ComplianceRule) ExtendedField() string {
	return ""
}

func (v ComplianceRule) GetCategory() string {
	return v.TestSeverity
}

func (ComplianceRule) GetJSONCategory() string {
	return "test_severity"
}

type CloudCompliance struct {
	Count               int32       `json:"count,omitempty" required:"true"`
	Reason              string      `json:"reason" required:"true"`
	Resource            string      `json:"resource" required:"true"`
	Status              string      `json:"status" required:"true"`
	Region              string      `json:"region" required:"true"`
	AccountID           string      `json:"account_id" required:"true"`
	Group               string      `json:"group" required:"true"`
	Service             string      `json:"service" required:"true"`
	Title               string      `json:"title" required:"true"`
	ComplianceCheckType string      `json:"compliance_check_type" required:"true"`
	CloudProvider       string      `json:"cloud_provider" required:"true"`
	NodeName            string      `json:"node_name" required:"true"`
	NodeID              string      `json:"node_id" required:"true"`
	Masked              bool        `json:"masked" required:"true"`
	UpdatedAt           int64       `json:"updated_at" required:"true"`
	Type                string      `json:"type" required:"true"`
	ControlID           string      `json:"control_id" required:"true"`
	Description         string      `json:"description" required:"true"`
	Severity            string      `json:"severity" required:"true"`
	Resources           []BasicNode `json:"resources" required:"false"`
}

func (CloudCompliance) NodeType() string {
	return "CloudCompliance"
}

func (CloudCompliance) ExtendedField() string {
	return ""
}

func (v CloudCompliance) GetCategory() string {
	return v.Severity
}

func (CloudCompliance) GetJSONCategory() string {
	return "severity"
}

type ScanReportFieldsResponse struct {
	Vulnerability []string `json:"vulnerability"`
	Secret        []string `json:"secret"`
	Malware       []string `json:"malware"`
	Compliance    []string `json:"compliance"`
}
