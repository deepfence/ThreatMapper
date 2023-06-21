package ingesters

import (
	"encoding/json"
	"time"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type VulnerabilityScanStatus struct {
	Timestamp   time.Time `json:"@timestamp"`
	ScanID      string    `json:"scan_id"`
	ScanStatus  string    `json:"scan_status"`
	ScanMessage string    `json:"scan_message"`
}

type Vulnerability struct {
	Count                      int      `json:"count"`
	Timestamp                  string   `json:"@timestamp"`
	Masked                     bool     `json:"masked"`
	Type                       string   `json:"type"`
	Scan_id                    string   `json:"scan_id"`
	Cve_id                     string   `json:"cve_id"`
	Cve_type                   string   `json:"cve_type"`
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
		UNWIND $batch as row
		MERGE (v:VulnerabilityStub{node_id:row.cve_id})
		MERGE (n:Vulnerability{node_id:row.cve_caused_by_package+row.cve_id})
		MERGE (n) -[:IS]-> (v)
		SET n+= row, v.masked = COALESCE(v.masked, false)
		WITH n, row.scan_id as scan_id
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
		res = append(res, utils.ToMap(v))
	}
	return res
}

func (c Vulnerability) ToMap() map[string]interface{} {
	out, err := json.Marshal(c)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	_ = json.Unmarshal(out, &bb)
	return bb
}
