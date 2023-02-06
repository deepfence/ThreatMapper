package ingesters

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
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
	Timestamp           time.Time       `json:"@timestamp"`
	ComplianceCheckType string          `json:"compliance_check_type"`
	Masked              string          `json:"masked"`
	NodeID              string          `json:"node_id"`
	Result              ComplianceStats `json:"result" nested_json:"true"`
	ScanID              string          `json:"scan_id"`
	ScanMessage         string          `json:"scan_message"`
	Status              string          `json:"status"`
	Type                string          `json:"type"`
	TotalChecks         int             `json:"total_checks"`
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
	NodeName            string `json:"node_name"`
	NodeID              string `json:"node_id"`
	ScanID              string `json:"scan_id"`
	Masked              string `json:"masked"`
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
		MERGE (n:CloudComplianceResult{resource:row.resource, scan_id: row.scan_id, control_id: row.control_id})
		MERGE (m:CloudResource{node_id: row.resource})
		MERGE (n) -[:SCANNED]-> (m)
		SET n+= row`,
		map[string]interface{}{"batch": CloudCompliancesToMaps(data)}); err != nil {
		return err
	}

	if _, err = tx.Run(fmt.Sprintf(`
		MATCH (n:CloudComplianceResult)
		MERGE (m:%s{node_id: n.scan_id})
		SET m.time_stamp = timestamp()
		MERGE (m) -[:DETECTED]-> (n)`, utils.NEO4J_CLOUD_COMPLIANCE_SCAN),
		map[string]interface{}{}); err != nil {
		return err
	}

	return tx.Commit()
}

func CommitFuncCloudComplianceScanStatus(ns string, data []CloudComplianceScanStatus) error {
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

	ccScanMaps := CloudComplianceScansToMaps(data)
	if _, err = tx.Run(fmt.Sprintf(`
		UNWIND $batch as row
		MATCH (n:%s{node_id: row.scan_id})
		MATCH (m:Node{node_id: row.connected_node_id})
		MATCH (n) -[:SCANNED]-> (m)
		SET n+= row`, utils.NEO4J_CLOUD_COMPLIANCE_SCAN),
		map[string]interface{}{"batch": ccScanMaps}); err != nil {
		return err
	}

	return tx.Commit()
}

func CloudCompliancesToMaps(ms []CloudCompliance) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, utils.ToMap(v))
	}
	return res
}

func CloudComplianceScansToMaps(ms []CloudComplianceScanStatus) []map[string]interface{} {
	var res []map[string]interface{}
	for _, v := range ms {
		out := v.ToMap()
		res = append(res, out)
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

func (c CloudComplianceScanStatus) ToMap() map[string]interface{} {
	out, err := json.Marshal(c)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	_ = json.Unmarshal(out, &bb)
	if results, ok := bb["result"]; ok {
		resultsByte, err := json.Marshal(results)
		if err != nil {
			resultsByte = []byte{}
		}
		bb["result"] = string(resultsByte)
	}
	if nodeId, ok := bb["node_id"]; ok {
		bb["connected_node_id"] = nodeId
		delete(bb, "node_id")
	}
	return bb
}

