package processors

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_ingester/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/twmb/franz-go/pkg/kgo"
)

var (
	vulnerabilityProcessor   *BulkProcessor
	complianceProcessor      *BulkProcessor
	cloudComplianceProcessor *BulkProcessor
	secretsProcessor         *BulkProcessor
)

type Mappable interface {
	ToMap() map[string]interface{}
}

func Process[T Mappable](s *BulkProcessor, tenantID string, b []byte) error {
	var struc T
	err := json.Unmarshal(b, &struc)
	if err != nil {
		return err
	}

	s.Add(NewBulkRequest(tenantID, struc.ToMap()))
	return nil
}

func StartKafkaProcessors(ctx context.Context) {
	vulnerabilityProcessor = NewBulkProcessor(utils.VULNERABILITY_SCAN, ingesters.CommitFuncVulnerabilities)
	vulnerabilityProcessor.Start(ctx)

	complianceProcessor = NewBulkProcessor(utils.COMPLIANCE_SCAN, ingesters.CommitFuncCompliance)
	complianceProcessor.Start(ctx)

	cloudComplianceProcessor := NewBulkProcessor(utils.CLOUD_COMPLIANCE_SCAN, ingesters.CommitFuncCloudCompliance)
	cloudComplianceProcessor.Start(ctx)

	secretsProcessor = NewBulkProcessor(utils.SECRET_SCAN, ingesters.CommitFuncSecrets)
	secretsProcessor.Start(ctx)
}

func StopKafkaProcessors() {
	vulnerabilityProcessor.Stop()
	complianceProcessor.Stop()
	cloudComplianceProcessor.Stop()
	secretsProcessor.Stop()
}

func tenantID(rh []kgo.RecordHeader) string {
	for _, h := range rh {
		if h.Key == "tenant_id" {
			return string(h.Value)
		}
	}
	return ""
}

func processRecord(r *kgo.Record) {
	// get tenant id from headers
	tenant := tenantID(r.Headers)

	var err error
	switch r.Topic {
	case utils.VULNERABILITY_SCAN:
		vulnerabilitiesProcessed.Inc()
		err = Process[ingesters.DfVulnerabilityStruct](vulnerabilityProcessor, tenant, r.Value)

	case utils.SECRET_SCAN:
		secretProcessed.Inc()
		err = Process[ingesters.Secret](secretsProcessor, tenant, r.Value)

	case utils.COMPLIANCE_SCAN:
		complianceProcessed.Inc()
		err = Process[ingesters.ComplianceDoc](complianceProcessor, tenant, r.Value)

	case utils.CLOUD_COMPLIANCE_SCAN:
		cloudComplianceProcessed.Inc()
		err = Process[ingesters.CloudComplianceDoc](cloudComplianceProcessor, tenant, r.Value)

	default:
		log.Error().Msgf("Not Implemented for topic %s", r.Topic)
	}
	if err != nil {
		log.Error().Msgf("Process err: %s", err)
	}
}

func StartKafkaConsumers(
	ctx context.Context,
	brokers []string,
	topics []string,
	group string,
	kgoLogger kgo.Logger,
) error {

	log.Info().Msgf("brokers: %v", brokers)
	log.Info().Msgf("topics: %v", topics)
	log.Info().Msgf("group ID: %v", group)

	opts := []kgo.Opt{
		kgo.SeedBrokers(brokers...),
		kgo.ConsumerGroup(group),
		kgo.ConsumeTopics(topics...),
		kgo.ClientID(group),
		kgo.FetchMinBytes(1e3),
		kgo.WithLogger(kgoLogger),
	}

	kc, err := kgo.NewClient(opts...)
	if err != nil {
		return err
	}

	if err := kc.Ping(ctx); err != nil {
		kc.Close()
		return err
	}

	go func() {
	loop:
		for {
			select {
			case <-ctx.Done():
				log.Info().Msg("stop consuming from kafka")
				break loop
			default:
				records := kc.PollRecords(ctx, 1000)
				records.EachRecord(processRecord)
				records.EachError(func(s string, i int32, err error) {
					log.Error().Msgf("topic=%s partition=%d error: %s", s, i, err)
				})
			}
		}
		kc.Close()
	}()
	return nil
}
