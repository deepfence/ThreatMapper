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

type SecretIngester struct{}

func NewSecretIngester() KafkaIngester[[]map[string]interface{}] {
	return &SecretIngester{}
}

func (tc *SecretIngester) Ingest(
	ctx context.Context,
	cs []map[string]interface{},
	ingestC chan *kgo.Record,
) error {
	tenantID, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}

	rh := []kgo.RecordHeader{
		{Key: "namespace", Value: []byte(tenantID)},
	}

	for _, c := range cs {
		cb, err := json.Marshal(c)
		if err != nil {
			log.Error().Msg(err.Error())
		} else {
			ingestC <- &kgo.Record{
				Topic:   utils.SECRET_SCAN,
				Value:   cb,
				Headers: rh,
			}
		}
	}

	return nil
}

type SecretScanStatusIngester struct{}

func NewSecretScanStatusIngester() KafkaIngester[[]ingesters.SecretScanStatus] {
	return &SecretScanStatusIngester{}
}

func (tc *SecretScanStatusIngester) Ingest(
	ctx context.Context,
	statuses []ingesters.SecretScanStatus,
	ingestC chan *kgo.Record,
) error {
	tenantID, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}

	rh := []kgo.RecordHeader{
		{Key: "namespace", Value: []byte(tenantID)},
	}

	for _, c := range statuses {
		cb, err := json.Marshal(c)
		if err != nil {
			log.Error().Msg(err.Error())
		} else {
			ingestC <- &kgo.Record{
				Topic:   utils.SECRET_SCAN_STATUS,
				Value:   cb,
				Headers: rh,
			}
		}
	}

	return nil
}
