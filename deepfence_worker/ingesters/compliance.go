package ingesters

import (
	"encoding/json"
	"time"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type ComplianceScanStatus struct {
	Timestamp   time.Time `json:"@timestamp"`
	ScanID      string    `json:"scan_id"`
	ScanStatus  string    `json:"scan_status"`
	ScanMessage string    `json:"scan_message"`
}

type Compliance struct {
	Type                string `json:"type"`
	Timestamp           string `json:"@timestamp"`
	Masked              bool   `json:"masked"`
	TestCategory        string `json:"test_category"`
	TestNumber          string `json:"test_number"`
	TestInfo            string `json:"description"`
	RemediationScript   string `json:"remediation_script,omitempty"`
	RemediationAnsible  string `json:"remediation_ansible,omitempty"`
	RemediationPuppet   string `json:"remediation_puppet,omitempty"`
	Resource            string `json:"resource"`
	TestRationale       string `json:"test_rationale"`
	TestSeverity        string `json:"test_severity"`
	TestDesc            string `json:"test_desc"`
	Status              string `json:"status"`
	ComplianceCheckType string `json:"compliance_check_type"`
	ScanId              string `json:"scan_id"`
	NodeId              string `json:"node_id"`
	NodeType            string `json:"node_type"`
}

func CommitFuncCompliance(ns string, data []Compliance) error {
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
		MERGE (n:Compliance{node_id:row.node_id, test_number:row.test_number})
		SET n+= row
		WITH n, row.scan_id as scan_id
		MERGE (m:ComplianceScan{node_id: scan_id})
		MERGE (m) -[r:DETECTED]-> (n)
		SET r.masked = false`,
		map[string]interface{}{"batch": CompliancesToMaps(data)}); err != nil {
		return err
	}

	return tx.Commit()
}

func CompliancesToMaps(ms []Compliance) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, utils.ToMap(v))
	}
	return res
}

func (c Compliance) ToMap() map[string]interface{} {
	out, err := json.Marshal(c)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	_ = json.Unmarshal(out, &bb)
	return bb
}
