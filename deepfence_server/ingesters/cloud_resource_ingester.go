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

type CloudResourceIngester struct{}

func NewCloudResourceIngester() KafkaIngester[[]ingesters.CloudResource] {
	return &CloudResourceIngester{}
}

func (tc *CloudResourceIngester) Ingest(
	ctx context.Context,
	cs []ingesters.CloudResource,
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
				Topic:   utils.CLOUD_RESOURCE,
				Value:   cb,
				Headers: rh,
			}
		}
	}

	return nil
}
