package reporters_graph

type VulnerabilityThreatGraphRequest struct {
	GraphType string `json:"graph_type" validate:"required,oneof=most_vulnerable_attack_paths direct_internet_exposure indirect_internet_exposure" required:"true" enum:"most_vulnerable_attack_paths,direct_internet_exposure,indirect_internet_exposure"`
}

type VulnerabilityThreatGraph struct {
	AttackPath      [][]string    `json:"attack_path"`
	CveAttackVector string        `json:"cve_attack_vector"`
	CveID           []string      `json:"cve_id"`
	Ports           []interface{} `json:"ports"`
}

func GetVulnerabilityThreatGraph(graphType string) ([]VulnerabilityThreatGraph, error) {
	vulnerabilityThreatGraph := []VulnerabilityThreatGraph{}
	return vulnerabilityThreatGraph, nil
}
