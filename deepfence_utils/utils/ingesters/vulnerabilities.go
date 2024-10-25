package ingesters

import (
	"strings"
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
	CISAKEV                 bool     `json:"cisa_kev"`
	EPSSScore               float64  `json:"epss_score"`
	Namespace               string   `json:"namespace"`
}

type VulnerabilityRule struct {
	NodeID             string   `json:"node_id"`
	CveID              string   `json:"cve_id"`
	CveType            string   `json:"cve_type"`
	CveSeverity        string   `json:"cve_severity"`
	PackageName        string   `json:"package_name"`
	CveFixedIn         string   `json:"cve_fixed_in"`
	CveLink            string   `json:"cve_link"`
	CveDescription     string   `json:"cve_description"`
	CveCvssScore       float64  `json:"cve_cvss_score"`
	CveOverallScore    float64  `json:"cve_overall_score"`
	CveAttackVector    string   `json:"cve_attack_vector"`
	URLs               []string `json:"urls"`
	ExploitPOC         string   `json:"exploit_poc"`
	ParsedAttackVector string   `json:"parsed_attack_vector"`
	CISAKEV            bool     `json:"cisa_kev"`
	EPSSScore          float64  `json:"epss_score"`
	Namespace          string   `json:"namespace"`
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
		}, VulnerabilityRule{
			NodeID:             strings.Join([]string{c.CveID, c.Namespace, c.CveCausedByPackage}, "-"),
			CveID:              c.CveID,
			CveType:            c.CveType,
			CveSeverity:        c.CveSeverity,
			PackageName:        c.CveCausedByPackage,
			CveFixedIn:         c.CveFixedIn,
			CveLink:            c.CveLink,
			CveDescription:     c.CveDescription,
			CveCvssScore:       c.CveCvssScore,
			CveOverallScore:    c.CveOverallScore,
			CveAttackVector:    c.CveAttackVector,
			URLs:               c.URLs,
			ExploitPOC:         c.ExploitPOC,
			ParsedAttackVector: c.ParsedAttackVector,
			CISAKEV:            c.CISAKEV,
			EPSSScore:          c.EPSSScore,
			Namespace:          c.Namespace,
		}
}
