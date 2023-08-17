package ingesters

type VulnerabilityScanStatus struct {
	ScanID      string `json:"scan_id"`
	ScanStatus  string `json:"scan_status"`
	ScanMessage string `json:"scan_message"`
}

type Vulnerability struct {
	ScanId                     string   `json:"scan_id"`
	Cve_id                     string   `json:"cve_id"`
	Cve_severity               string   `json:"cve_severity"`
	Cve_caused_by_package      string   `json:"cve_caused_by_package"`
	Cve_caused_by_package_path string   `json:"cve_caused_by_package_path"`
	Cve_container_layer        string   `json:"cve_container_layer"`
	Cve_fixed_in               string   `json:"cve_fixed_in"`
	Cve_link                   string   `json:"cve_link"`
	Cve_description            string   `json:"cve_description"`
	Cve_cvss_score             float64  `json:"cve_cvss_score"`
	Cve_overall_score          float64  `json:"cve_overall_score"`
	Cve_attack_vector          string   `json:"cve_attack_vector"`
	URLs                       []string `json:"urls"`
	ExploitPOC                 string   `json:"exploit_poc"`
	ParsedAttackVector         string   `json:"parsed_attack_vector"`
	ExploitabilityScore        int      `json:"exploitability_score"`
	InitExploitabilityScore    int      `json:"init_exploitability_score"`
	HasLiveConnection          bool     `json:"has_live_connection"`
}

type VulnerabilityRule struct {
	Cve_id             string   `json:"cve_id"`
	Cve_severity       string   `json:"cve_severity"`
	Cve_fixed_in       string   `json:"cve_fixed_in"`
	Cve_link           string   `json:"cve_link"`
	Cve_description    string   `json:"cve_description"`
	Cve_cvss_score     float64  `json:"cve_cvss_score"`
	Cve_overall_score  float64  `json:"cve_overall_score"`
	Cve_attack_vector  string   `json:"cve_attack_vector"`
	URLs               []string `json:"urls"`
	ExploitPOC         string   `json:"exploit_poc"`
	ParsedAttackVector string   `json:"parsed_attack_vector"`
}

type VulnerabilityData struct {
	Cve_id                     string `json:"cve_id"`
	Cve_severity               string `json:"cve_severity"`
	Cve_caused_by_package      string `json:"cve_caused_by_package"`
	Cve_caused_by_package_path string `json:"cve_caused_by_package_path"`
	Cve_container_layer        string `json:"cve_container_layer"`
	Cve_link                   string `json:"cve_link"`
	ExploitabilityScore        int    `json:"exploitability_score"`
	InitExploitabilityScore    int    `json:"init_exploitability_score"`
	HasLiveConnection          bool   `json:"has_live_connection"`
}

func (c Vulnerability) Split() (VulnerabilityData, VulnerabilityRule) {
	return VulnerabilityData{
			Cve_id:                     c.Cve_id,
			Cve_severity:               c.Cve_severity,
			Cve_caused_by_package:      c.Cve_caused_by_package,
			Cve_caused_by_package_path: c.Cve_caused_by_package_path,
			Cve_container_layer:        c.Cve_container_layer,
			Cve_link:                   c.Cve_link,
			ExploitabilityScore:        c.ExploitabilityScore,
			InitExploitabilityScore:    c.InitExploitabilityScore,
			HasLiveConnection:          c.HasLiveConnection,
		}, VulnerabilityRule{
			Cve_id:             c.Cve_id,
			Cve_severity:       c.Cve_severity,
			Cve_fixed_in:       c.Cve_fixed_in,
			Cve_link:           c.Cve_link,
			Cve_description:    c.Cve_description,
			Cve_cvss_score:     c.Cve_cvss_score,
			Cve_overall_score:  c.Cve_overall_score,
			Cve_attack_vector:  c.Cve_attack_vector,
			URLs:               c.URLs,
			ExploitPOC:         c.ExploitPOC,
			ParsedAttackVector: c.ParsedAttackVector,
		}
}
