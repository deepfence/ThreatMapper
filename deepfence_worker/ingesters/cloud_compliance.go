package ingesters

import (
	"encoding/json"
	"time"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type ComplianceStats struct {
	Alarm                int     `json:"alarm"`
	Ok                   int     `json:"ok"`
	Info                 int     `json:"info"`
	Skip                 int     `json:"skip"`
	Error                int     `json:"error"`
	CompliancePercentage float64 `json:"compliance_percentage"`
}

type CloudComplianceScanStatus struct {
	Timestamp            time.Time       `json:"@timestamp"`
	ComplianceCheckTypes []string        `json:"compliance_check_types"`
	Result               ComplianceStats `json:"result" nested_json:"true"`
	ScanID               string          `json:"scan_id"`
	ScanMessage          string          `json:"scan_message"`
	ScanStatus           string          `json:"scan_status"`
	Type                 string          `json:"type"`
	TotalChecks          int             `json:"total_checks"`
}

type CloudCompliance struct {
	DocId               string `json:"doc_id"`
	Timestamp           string `json:"@timestamp"`
	Count               int    `json:"count,omitempty"`
	Reason              string `json:"reason"`
	Resource            string `json:"resource"`
	Status              string `json:"status"`
	Region              string `json:"region"`
	AccountID           string `json:"account_id"`
	Group               string `json:"group"`
	Service             string `json:"service"`
	Title               string `json:"title"`
	ComplianceCheckType string `json:"compliance_check_type"`
	CloudProvider       string `json:"cloud_provider"`
	ScanID              string `json:"scan_id"`
	Masked              bool   `json:"masked"`
	Type                string `json:"type"`
	ControlID           string `json:"control_id"`
	Description         string `json:"description"`
	Severity            string `json:"severity"`
}

func CommitFuncCloudCompliance(ns string, data []CloudCompliance) error {
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

	if _, err = tx.Run(`
		UNWIND $batch as row
		MERGE (n:CloudCompliance{node_id: row.scan_id + "--" + row.control_id + "--" + COALESCE(row.resource, row.account_id, ""), resource:row.resource, scan_id: row.scan_id, control_id: row.control_id})
		MERGE (m:CloudResource{node_id: row.resource})
		SET n+= row
		WITH n, m
		MATCH (l:CloudComplianceScan{node_id: n.scan_id})
		MERGE (l) -[r:DETECTED]-> (n)
		SET r.masked = false`,
		map[string]interface{}{"batch": CloudCompliancesToMaps(data)}); err != nil {
		return err
	}

	return tx.Commit()
}

func CloudCompliancesToMaps(ms []CloudCompliance) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, v.ToMap())
	}
	return res
}

func (c CloudCompliance) ToMap() map[string]interface{} {
	out, err := json.Marshal(c)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	_ = json.Unmarshal(out, &bb)
	return bb
}
