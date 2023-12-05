package ingesters

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
	ScanID              string `json:"scan_id"`
	NodeID              string `json:"node_id"`
	NodeType            string `json:"node_type"`
}

type ComplianceData struct {
	Type                string `json:"type"`
	RemediationScript   string `json:"remediation_script,omitempty"`
	RemediationAnsible  string `json:"remediation_ansible,omitempty"`
	RemediationPuppet   string `json:"remediation_puppet,omitempty"`
	Resource            string `json:"resource"`
	TestSeverity        string `json:"test_severity"`
	Status              string `json:"status"`
	ComplianceCheckType string `json:"compliance_check_type"`
	NodeID              string `json:"node_id"`
	NodeType            string `json:"node_type"`
}

type ComplianceRule struct {
	TestCategory  string `json:"test_category"`
	TestNumber    string `json:"test_number"`
	TestInfo      string `json:"description"`
	TestRationale string `json:"test_rationale"`
	TestSeverity  string `json:"test_severity"`
	TestDesc      string `json:"test_desc"`
}

func (c Compliance) Split() (ComplianceData, ComplianceRule) {
	return ComplianceData{
			Type:                c.Type,
			RemediationScript:   c.RemediationScript,
			RemediationAnsible:  c.RemediationAnsible,
			RemediationPuppet:   c.RemediationPuppet,
			Resource:            c.Resource,
			TestSeverity:        c.TestSeverity,
			Status:              c.Status,
			ComplianceCheckType: c.ComplianceCheckType,
			NodeID:              c.NodeID,
			NodeType:            c.NodeType,
		}, ComplianceRule{
			TestCategory:  c.TestCategory,
			TestNumber:    c.TestNumber,
			TestInfo:      c.TestInfo,
			TestRationale: c.TestRationale,
			TestSeverity:  c.TestSeverity,
			TestDesc:      c.TestDesc,
		}
}
