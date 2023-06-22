package ingesters

import (
	"time"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type ComplianceScanStatus struct {
	ScanID      string `json:"scan_id"`
	ScanStatus  string `json:"scan_status"`
	ScanMessage string `json:"scan_message"`
}

type Compliance struct {
	Type                string `json:"type"`
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

type complianceData struct {
	Type                string `json:"type"`
	RemediationScript   string `json:"remediation_script,omitempty"`
	RemediationAnsible  string `json:"remediation_ansible,omitempty"`
	RemediationPuppet   string `json:"remediation_puppet,omitempty"`
	Resource            string `json:"resource"`
	TestSeverity        string `json:"test_severity"`
	Status              string `json:"status"`
	ComplianceCheckType string `json:"compliance_check_type"`
	NodeId              string `json:"node_id"`
	NodeType            string `json:"node_type"`
}

type complianceRule struct {
	TestCategory  string `json:"test_category"`
	TestNumber    string `json:"test_number"`
	TestInfo      string `json:"description"`
	TestRationale string `json:"test_rationale"`
	TestSeverity  string `json:"test_severity"`
	TestDesc      string `json:"test_desc"`
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
		UNWIND $batch as row WITH row.rule as rule, row.data as data, row.scan_id as scan_id
		MERGE (n:Compliance{node_id:data.node_id})
		MERGE (r:ComplianceRule{node_id:rule.test_number})
		MERGE (n) -[:IS]-> (r)
		SET n += data,
		    n.masked = COALESCE(n.masked, false),
		    n.updated_at = TIMESTAMP(),
	        r += rule,
		    r.masked = COALESCE(r.masked, false),
		    r.updated_at = TIMESTAMP()
		WITH n, scan_id
		MERGE (m:ComplianceScan{node_id: scan_id})
		MERGE (m) -[l:DETECTED]-> (n)
		SET l.masked = false`,
		map[string]interface{}{"batch": CompliancesToMaps(data)}); err != nil {
		return err
	}

	return tx.Commit()
}

func CompliancesToMaps(ms []Compliance) []map[string]interface{} {
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

func (c Compliance) split() (complianceData, complianceRule) {
	return complianceData{
			Type:                c.Type,
			RemediationScript:   c.RemediationScript,
			RemediationAnsible:  c.RemediationAnsible,
			RemediationPuppet:   c.RemediationPuppet,
			Resource:            c.Resource,
			TestSeverity:        c.TestSeverity,
			Status:              c.Status,
			ComplianceCheckType: c.ComplianceCheckType,
			NodeId:              c.NodeId,
			NodeType:            c.NodeType,
		}, complianceRule{
			TestCategory:  c.TestCategory,
			TestNumber:    c.TestNumber,
			TestInfo:      c.TestInfo,
			TestRationale: c.TestRationale,
			TestSeverity:  c.TestSeverity,
			TestDesc:      c.TestDesc,
		}
}
