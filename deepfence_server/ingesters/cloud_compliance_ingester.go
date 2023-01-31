package ingesters

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_worker/ingesters"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/twmb/franz-go/pkg/kgo"
)

type CloudComplianceIngester struct{}

func NewCloudComplianceIngester() KafkaIngester[[]ingesters.CloudCompliance] {
	return &CloudComplianceIngester{}
}

func (tc *CloudComplianceIngester) Ingest(
	ctx context.Context,
	cs []ingesters.CloudCompliance,
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
				Topic:   utils.CLOUD_COMPLIANCE_SCAN,
				Value:   cb,
				Headers: rh,
			}
		}
	}

	return nil
}

type CloudComplianceScanStatusIngester struct{}

func NewCloudComplianceScanStatusIngester() KafkaIngester[[]ingesters.CloudComplianceScanStatus] {
	return &CloudComplianceScanStatusIngester{}
}

func (tc *CloudComplianceScanStatusIngester) Ingest(
	ctx context.Context,
	cs []ingesters.CloudComplianceScanStatus,
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
				Topic:   utils.CLOUD_COMPLIANCE_SCAN_STATUS,
				Value:   cb,
				Headers: rh,
			}
		}
	}

	return nil

}
