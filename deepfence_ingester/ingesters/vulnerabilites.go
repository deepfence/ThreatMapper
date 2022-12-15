package ingesters

import (
	"encoding/json"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type VulnerabilityScanStatus struct {
	Timestamp             time.Time `json:"@timestamp"`
	ContainerName         string    `json:"container_name"`
	HostName              string    `json:"host_name"`
	KubernetesClusterName string    `json:"kubernetes_cluster_name"`
	Masked                string    `json:"masked"`
	NodeID                string    `json:"node_id"`
	NodeName              string    `json:"node_name"`
	NodeType              string    `json:"node_type"`
	ScanID                string    `json:"scan_id"`
	ScanStatus            string    `json:"scan_status"`
}

type Vulnerability struct {
	Count                      int      `json:"count"`
	Timestamp                  string   `json:"@timestamp"`
	CveTuple                   string   `json:"cve_id_cve_severity_cve_container_image"`
	DocId                      string   `json:"doc_id"`
	Masked                     string   `json:"masked"`
	Type                       string   `json:"type"`
	Host                       string   `json:"host"`
	HostName                   string   `json:"host_name"`
	KubernetesClusterName      string   `json:"kubernetes_cluster_name"`
	NodeType                   string   `json:"node_type"`
	Scan_id                    string   `json:"scan_id"`
	Cve_id                     string   `json:"cve_id"`
	Cve_type                   string   `json:"cve_type"`
	Cve_container_image        string   `json:"cve_container_image"`
	Cve_container_image_id     string   `json:"cve_container_image_id"`
	Cve_container_name         string   `json:"cve_container_name"`
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

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run("UNWIND $batch as row MERGE (n:Cve{node_id:row.cve_id}) SET n+= row",
		map[string]interface{}{"batch": CVEsToMaps(data)}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Cve) MERGE (m:CveScan{node_id: n.scan_id, host_name:n.host_name, time_stamp: timestamp()}) MERGE (m) -[:DETECTED]-> (n)",
		map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CveScan) MERGE (m:Node{node_id: n.host_name}) MERGE (n) -[:SCANNED]-> (m)",
		map[string]interface{}{}); err != nil {
		return err
	}

	return tx.Commit()
}

func CommitFuncVulnerabilitiesScanStatus(ns string, data []VulnerabilityScanStatus) error {
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

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	// TODO: add query to commit for scan status
	log.Error().Msg("Not implemented")

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
