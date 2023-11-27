package ingesters

import (
	"encoding/json"
	"time"
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
	DocID               string `json:"doc_id"`
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
	Type                string `json:"type"`
	ControlID           string `json:"control_id"`
	Description         string `json:"description"`
	Severity            string `json:"severity"`
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
