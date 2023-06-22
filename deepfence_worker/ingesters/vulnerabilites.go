package ingesters

import (
	"time"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

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
}

type vulnerabilityRule struct {
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

type vulnerabilityData struct {
	Cve_id                     string `json:"cve_id"`
	Cve_severity               string `json:"cve_severity"`
	Cve_caused_by_package      string `json:"cve_caused_by_package"`
	Cve_caused_by_package_path string `json:"cve_caused_by_package_path"`
	Cve_container_layer        string `json:"cve_container_layer"`
	Cve_link                   string `json:"cve_link"`
}

func CommitFuncVulnerabilities(ns string, data []Vulnerability) error {
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(ns))
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run(`
		UNWIND $batch as row WITH row.rule as rule, row.data as data, row.scan_id as scan_id
		MERGE (v:VulnerabilityStub{node_id:rule.cve_id})
		MERGE (n:Vulnerability{node_id:data.cve_caused_by_package+rule.cve_id})
		MERGE (n) -[:IS]-> (v)
		SET v += rule,
		    v.masked = COALESCE(v.masked, false),
		    v.updated_at = TIMESTAMP(),
		    n += data,
		    n.masked = COALESCE(n.masked, false),
		    n.updated_at = TIMESTAMP()
		WITH n, scan_id
		MATCH (m:VulnerabilityScan{node_id: scan_id})
		MERGE (m) -[r:DETECTED]-> (n)
		SET r.masked = false`,
		map[string]interface{}{"batch": CVEsToMaps(data)}); err != nil {
		log.Error().Msgf(err.Error())
		return err
	}

	return tx.Commit()
}

func CVEsToMaps(ms []Vulnerability) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		data, rule := v.split()
		res = append(res, map[string]interface{}{
			"rule":    utils.ToMap(rule),
			"data":    utils.ToMap(data),
			"scan_id": v.ScanId,
		})
	}
	return res
}

func (c Vulnerability) split() (vulnerabilityData, vulnerabilityRule) {
	return vulnerabilityData{
			Cve_id:                     c.Cve_id,
			Cve_severity:               c.Cve_severity,
			Cve_caused_by_package:      c.Cve_caused_by_package,
			Cve_caused_by_package_path: c.Cve_caused_by_package_path,
			Cve_container_layer:        c.Cve_container_layer,
			Cve_link:                   c.Cve_link,
		}, vulnerabilityRule{
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
