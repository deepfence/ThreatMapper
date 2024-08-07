package ingesters

import (
	"fmt"
)

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
	CveID              string   `json:"cve_id"`
	CveType            string   `json:"cve_type"`
	CveSeverity        string   `json:"cve_severity"`
	CveFixedIn         string   `json:"cve_fixed_in"`
	CveLink            string   `json:"cve_link"`
	CveDescription     string   `json:"cve_description"`
	CveCvssScore       float64  `json:"cve_cvss_score"`
	CveOverallScore    float64  `json:"cve_overall_score"`
	CveAttackVector    string   `json:"cve_attack_vector"`
	URLs               []string `json:"urls"`
	ExploitPOC         string   `json:"exploit_poc"`
	PackageName        string   `json:"package_name"`
	ParsedAttackVector string   `json:"parsed_attack_vector"`
	CISAKEV            bool     `json:"cisa_kev"`
	EPSSScore          float64  `json:"epss_score"`
	Namespace          string   `json:"namespace"`
	NodeID             string   `json:"node_id"`
}

func (v *VulnerabilityRule) SetNodeID() {
	v.NodeID = fmt.Sprintf("%s-%s", v.CveID, v.Namespace)
}

func (v *VulnerabilityRule) ToMap() map[string]interface{} {
	urls := []string{}
	if v.URLs != nil {
		urls = v.URLs
	}
	return map[string]interface{}{
		"cve_id":               v.CveID,
		"cve_type":             v.CveType,
		"cve_severity":         v.CveSeverity,
		"cve_fixed_in":         v.CveFixedIn,
		"cve_link":             v.CveLink,
		"cve_description":      v.CveDescription,
		"cve_cvss_score":       v.CveCvssScore,
		"cve_overall_score":    v.CveOverallScore,
		"cve_attack_vector":    v.CveAttackVector,
		"urls":                 urls,
		"exploit_poc":          v.ExploitPOC,
		"package_name":         v.PackageName,
		"parsed_attack_vector": v.ParsedAttackVector,
		"cisa_kev":             v.CISAKEV,
		"epss_score":           v.EPSSScore,
		"namespace":            v.Namespace,
		"node_id":              v.NodeID,
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

func (c Vulnerability) Split() (VulnerabilityData, VulnerabilityRule) {
	vuln := VulnerabilityData{
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
	vulnRule := VulnerabilityRule{
		CveID:       c.CveID,
		Namespace:   c.Namespace,
		PackageName: c.CveCausedByPackage,
	}
	vulnRule.SetNodeID()
	return vuln, vulnRule
}
