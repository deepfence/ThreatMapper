package ingesters

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/twmb/franz-go/pkg/kgo"
)

type CloudComplianceIngester struct{}

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

func NewCloudComplianceIngester() KafkaIngester[[]ComplianceDoc] {
	return &ComplianceIngester{}
}

func (tc *CloudComplianceIngester) Ingest(
	ctx context.Context,
	cs []CloudComplianceDoc,
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
				Topic:   "cloud-compliance-scan",
				Value:   cb,
				Headers: rh,
			}
		}
	}

	return nil

}
