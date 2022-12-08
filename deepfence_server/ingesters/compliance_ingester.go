package ingesters

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/twmb/franz-go/pkg/kgo"
)

type ComplianceIngester struct{}

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
	Resource              string `json:"resource"`
	TestRationale         string `json:"test_rationale"`
	TestSeverity          string `json:"test_severity"`
	TestDesc              string `json:"test_desc"`
	Status                string `json:"status"`
	ComplianceCheckType   string `json:"compliance_check_type"`
	ScanId                string `json:"scan_id"`
	ComplianceNodeType    string `json:"compliance_node_type"`
}

func NewComplianceIngester() KafkaIngester[[]ComplianceDoc] {
	return &ComplianceIngester{}
}

func (tc *ComplianceIngester) Ingest(
	ctx context.Context,
	cs []ComplianceDoc,
	ingestC chan *kgo.Record,
) error {

	tenantID, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}

	rh := []kgo.RecordHeader{
		{Key: "tenant_id", Value: []byte(tenantID)},
	}

	for _, c := range cs {
		cb, err := json.Marshal(c)
		if err != nil {
			log.Error().Msg(err.Error())
		} else {
			ingestC <- &kgo.Record{
				Topic:   "compliance",
				Value:   cb,
				Headers: rh,
			}
		}
	}

	return nil
}
