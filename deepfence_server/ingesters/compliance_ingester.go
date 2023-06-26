package ingesters

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/ingesters"
	"github.com/twmb/franz-go/pkg/kgo"
)

type ComplianceIngester struct{}

func NewComplianceIngester() KafkaIngester[[]ingesters.Compliance] {
	return &ComplianceIngester{}
}

func (tc *ComplianceIngester) Ingest(
	ctx context.Context,
	cs []ingesters.Compliance,
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
				Topic:   utils.COMPLIANCE_SCAN,
				Value:   cb,
				Headers: rh,
			}
		}
	}

	return nil
}

type ComplianceScanStatusIngester struct{}

func NewComplianceScanStatusIngester() KafkaIngester[[]ingesters.ComplianceScanStatus] {
	return &ComplianceScanStatusIngester{}
}

func (tc *ComplianceScanStatusIngester) Ingest(
	ctx context.Context,
	cs []ingesters.ComplianceScanStatus,
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
				Topic:   utils.COMPLIANCE_SCAN_STATUS,
				Value:   cb,
				Headers: rh,
			}
		}
	}

	return nil
}
