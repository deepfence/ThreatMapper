package main

import (
	"crypto/md5"
	"encoding/json"
	"fmt"

	"github.com/olivere/elastic/v7"
)

type ComplianceDoc struct {
	DocId                 string `json:"doc_id"`
	Type                  string `json:"type"`
	TimeStamp             int64  `json:"time_stamp"`
	Timestamp             string `json:"@timestamp"`
	Masked                string `json:"masked"`
	NodeId                string `json:"node_id"`
	NodeType              string `json:"node_type"`
	KubernetesClusterName string `json:"kubernetes_cluster_name"`
	KubernetesClusterId   string `json:"kubernetes_cluster_id"`
	NodeName              string `json:"node_name"`
	TestCategory          string `json:"test_category"`
	TestNumber            string `json:"test_number"`
	TestInfo              string `json:"description"`
	RemediationScript     string `json:"remediation_script,omitempty"`
	RemediationAnsible    string `json:"remediation_ansible,omitempty"`
	RemediationPuppet     string `json:"remediation_puppet,omitempty"`
	TestRationale         string `json:"test_rationale"`
	TestSeverity          string `json:"test_severity"`
	TestDesc              string `json:"test_desc"`
	Status                string `json:"status"`
	ComplianceCheckType   string `json:"compliance_check_type"`
	ScanId                string `json:"scan_id"`
	ComplianceNodeType    string `json:"compliance_node_type"`
}
type CloudComplianceDoc struct {
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

func processCompliance(compliance []byte, bulkp *elastic.BulkProcessor) {
	var doc ComplianceDoc
	err := json.Unmarshal(compliance, &doc)
	if err != nil {
		log.Errorf("error unmarshal compliance scan result: %s", err)
		return
	}
	doc.Timestamp = getCurrentTime()
	docId := fmt.Sprintf("%x", md5.Sum([]byte(doc.ScanId+doc.TestNumber)))
	doc.DocId = docId

	event, err := json.Marshal(doc)
	if err != nil {
		log.Errorf("error marshal updated compliance data: %s", err)
		return
	} else {
		bulkp.Add(elastic.NewBulkUpdateRequest().Index(complianceScanIndexName).
			Id(docId).Script(elastic.NewScriptStored("default_upsert").Param("event", doc)).
			Upsert(doc).ScriptedUpsert(true).RetryOnConflict(3))
		complianceTaskQueue <- event
	}
}

func processCloudCompliance(compliance []byte, bulkp *elastic.BulkProcessor) {
	var doc CloudComplianceDoc
	err := json.Unmarshal(compliance, &doc)
	if err != nil {
		log.Errorf("error unmarshal cloud compliance scan result: %s", err)
		return
	}
	doc.Timestamp = getCurrentTime()
	docId := fmt.Sprintf("%x", md5.Sum([]byte(doc.ScanID+doc.ControlID+doc.Resource+doc.Group)))
	doc.DocId = docId

	event, err := json.Marshal(doc)
	if err != nil {
		log.Errorf("error marshal updated compliance data: %s", err)
		return
	} else {
		bulkp.Add(elastic.NewBulkUpdateRequest().Index(cloudComplianceScanIndexName).
			Id(docId).Script(elastic.NewScriptStored("default_upsert").Param("event", doc)).
			Upsert(doc).ScriptedUpsert(true).RetryOnConflict(3))
		complianceTaskQueue <- event
	}
}
