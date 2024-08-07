package threatintel

type Artefact struct {
	Name    string `json:"name"`
	Type    string `json:"type"`
	Content []byte `json:"content"`
}

type DeepfenceRule struct {
	RuleID  string `json:"rule_id"`
	Type    string `json:"type"`
	Payload string `json:"payload"`
}

type TracerFeeds struct {
	NetworkRules      []DeepfenceRule `json:"network_rules"`
	FilesystemRules   []DeepfenceRule `json:"filesystem_rules"`
	ProcessRules      []DeepfenceRule `json:"process_rules"`
	ExternalArtefacts []Artefact      `json:"external_artefacts"`
}

type ScannerFeeds struct {
	VulnerabilityRules   []DeepfenceRule `json:"vulnerability_rules"`
	SecretRules          []DeepfenceRule `json:"secret_rules"`
	MalwareRules         []DeepfenceRule `json:"malware_rules"`
	ComplianceRules      []DeepfenceRule `json:"compliance_rules"`
	CloudComplianceRules []DeepfenceRule `json:"cloud_compliance_rules"`
}

type FeedsBundle struct {
	Version      string       `json:"version"`
	CreatedAt    int64        `json:"created_at"`
	ScannerFeeds ScannerFeeds `json:"scanner_feeds"`
	TracerFeeds  TracerFeeds  `json:"tracer_feeds"`
}

func NewFeeds(createdAt int64, version string) *FeedsBundle {
	return &FeedsBundle{
		Version:   version,
		CreatedAt: createdAt,
	}
}

func (fb *FeedsBundle) RemoveAllTypeNetworkRules(t string) {
	remaining := []DeepfenceRule{}
	for _, rule := range fb.TracerFeeds.NetworkRules {
		if rule.Type != t {
			remaining = append(remaining, rule)
		}
	}
	fb.TracerFeeds.NetworkRules = remaining
}

func (fb *FeedsBundle) AddNetworkRules(df ...DeepfenceRule) {
	fb.TracerFeeds.NetworkRules = append(fb.TracerFeeds.NetworkRules, df...)
}

func (fb *FeedsBundle) AddFilesystemRules(df []DeepfenceRule) {
	fb.TracerFeeds.FilesystemRules = append(fb.TracerFeeds.FilesystemRules, df...)
}

func (fb *FeedsBundle) AddProcessRules(df []DeepfenceRule) {
	fb.TracerFeeds.ProcessRules = append(fb.TracerFeeds.ProcessRules, df...)
}

func (fb *FeedsBundle) AddTracerArtefacts(df []Artefact) {
	fb.TracerFeeds.ExternalArtefacts = append(fb.TracerFeeds.ExternalArtefacts, df...)
}

func (fb *FeedsBundle) AddVulnerabilityRules(df []DeepfenceRule) {
	fb.ScannerFeeds.VulnerabilityRules = append(fb.ScannerFeeds.VulnerabilityRules, df...)
}

func (fb *FeedsBundle) AddSecretRules(df []DeepfenceRule) {
	fb.ScannerFeeds.SecretRules = append(fb.ScannerFeeds.SecretRules, df...)
}

func (fb *FeedsBundle) AddMalwareRules(df []DeepfenceRule) {
	fb.ScannerFeeds.MalwareRules = append(fb.ScannerFeeds.MalwareRules, df...)
}

func (fb *FeedsBundle) AddComplianceRules(df []DeepfenceRule) {
	fb.ScannerFeeds.ComplianceRules = append(fb.ScannerFeeds.ComplianceRules, df...)
}

func (fb *FeedsBundle) AddCloudComplianceRules(df []DeepfenceRule) {
	fb.ScannerFeeds.CloudComplianceRules = append(fb.ScannerFeeds.CloudComplianceRules, df...)
}
