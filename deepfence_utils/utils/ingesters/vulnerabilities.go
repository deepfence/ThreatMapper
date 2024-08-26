package ingesters

type VulnerabilityScanStatus struct {
	ScanID      string `json:"scan_id"`
	ScanStatus  string `json:"scan_status"`
	ScanMessage string `json:"scan_message"`
}

type Vulnerability struct {
	ScanID                  string   `json:"scan_id"`
	CveID                   string   `json:"cve_id"`
	CveType                 string   `json:"cve_type"`
	CveSeverity             string   `json:"cve_severity"`
	CveCausedByPackage      string   `json:"cve_caused_by_package"`
	CveCausedByPackagePath  string   `json:"cve_caused_by_package_path"`
	CveContainerLayer       string   `json:"cve_container_layer"`
	CveFixedIn              string   `json:"cve_fixed_in"`
	CveLink                 string   `json:"cve_link"`
	CveDescription          string   `json:"cve_description"`
	CveCvssScore            float64  `json:"cve_cvss_score"`
	CveOverallScore         float64  `json:"cve_overall_score"`
	CveAttackVector         string   `json:"cve_attack_vector"`
	URLs                    []string `json:"urls"`
	ExploitPOC              string   `json:"exploit_poc"`
	ParsedAttackVector      string   `json:"parsed_attack_vector"`
	ExploitabilityScore     int      `json:"exploitability_score"`
	InitExploitabilityScore int      `json:"init_exploitability_score"`
	HasLiveConnection       bool     `json:"has_live_connection"`
	Namespace               string   `json:"namespace"`
}

type VulnerabilityRule struct {
	CveID               string    `json:"cve_id"`
	CveTypes            []string  `json:"cve_types"`
	CveSeverities       []string  `json:"cve_severities"`
	CveFixedIns         []string  `json:"cve_fixed_ins"`
	CveLinks            []string  `json:"cve_links"`
	CveDescriptions     []string  `json:"cve_descriptions"`
	CveCvssScores       []float64 `json:"cve_cvss_scores"`
	CveOverallScores    []float64 `json:"cve_overall_scores"`
	CveAttackVectors    []string  `json:"cve_attack_vectors"`
	URLs                []string  `json:"urls"`
	ExploitPOCs         []string  `json:"exploit_pocs"`
	PackageNames        []string  `json:"package_names"`
	ParsedAttackVectors []string  `json:"parsed_attack_vectors"`
	CISAKEV             bool      `json:"cisa_kev"`
	EPSSScore           float64   `json:"epss_score"`
	Namespaces          []string  `json:"namespaces"`
}

func (v *VulnerabilityRule) ToMap() map[string]interface{} {
	urls := []string{}
	if v.URLs != nil {
		urls = v.URLs
	}
	return map[string]interface{}{
		"cve_id":                v.CveID,
		"cve_types":             v.CveTypes,
		"cve_severities":        v.CveSeverities,
		"cve_fixed_ins":         v.CveFixedIns,
		"cve_links":             v.CveLinks,
		"cve_descriptions":      v.CveDescriptions,
		"cve_cvss_scores":       v.CveCvssScores,
		"cve_overall_scores":    v.CveOverallScores,
		"cve_attack_vectors":    v.CveAttackVectors,
		"urls":                  urls,
		"exploit_pocs":          v.ExploitPOCs,
		"package_names":         v.PackageNames,
		"parsed_attack_vectors": v.ParsedAttackVectors,
		"cisa_kev":              v.CISAKEV,
		"epss_score":            v.EPSSScore,
		"namespaces":            v.Namespaces,
	}
}

type VulnerabilityData struct {
	CveID                   string `json:"cve_id"`
	CveSeverity             string `json:"cve_severity"`
	CveCausedByPackage      string `json:"cve_caused_by_package"`
	CveCausedByPackagePath  string `json:"cve_caused_by_package_path"`
	CveContainerLayer       string `json:"cve_container_layer"`
	CveLink                 string `json:"cve_link"`
	ExploitabilityScore     int    `json:"exploitability_score"`
	InitExploitabilityScore int    `json:"init_exploitability_score"`
	HasLiveConnection       bool   `json:"has_live_connection"`
}

func (c Vulnerability) GetVulnerabilityData() VulnerabilityData {
	return VulnerabilityData{
		CveID:                   c.CveID,
		CveSeverity:             c.CveSeverity,
		CveCausedByPackage:      c.CveCausedByPackage,
		CveCausedByPackagePath:  c.CveCausedByPackagePath,
		CveContainerLayer:       c.CveContainerLayer,
		CveLink:                 c.CveLink,
		ExploitabilityScore:     c.ExploitabilityScore,
		InitExploitabilityScore: c.InitExploitabilityScore,
		HasLiveConnection:       c.HasLiveConnection,
	}
}
