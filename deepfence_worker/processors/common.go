package processors

import (
	"context"
	"encoding/json"

	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/ingesters"
	"github.com/twmb/franz-go/pkg/kgo"
)

var (
	processors map[string]*BulkProcessor
)

type Mappable interface {
	ToMap() map[string]interface{}
}

func Process(s *BulkProcessor, tenantID string, b []byte) error {
	s.Add(NewBulkRequest(tenantID, b))
	return nil
}

func desWrapper[T any](commit func(ns string, des []T) error) func(ns string, b [][]byte) error {
	return func(ns string, b [][]byte) error {
		ss := []T{}
		for i := range b {
			var s T
			err := json.Unmarshal(b[i], &s)
			if err != nil {
				return err
			}
			ss = append(ss, s)
		}

		return commit(ns, ss)
	}
}

func StartKafkaProcessors(ctx context.Context) {
	processors = map[string]*BulkProcessor{}

	processors[utils.VULNERABILITY_SCAN] = NewBulkProcessor(
		utils.VULNERABILITY_SCAN,
		desWrapper(ingesters.CommitFuncVulnerabilities),
	)
	processors[utils.COMPLIANCE_SCAN] = NewBulkProcessor(
		utils.COMPLIANCE_SCAN,
		desWrapper(ingesters.CommitFuncCompliance),
	)
	processors[utils.CLOUD_COMPLIANCE_SCAN] = NewBulkProcessor(
		utils.CLOUD_COMPLIANCE_SCAN,
		desWrapper(ingesters.CommitFuncCloudCompliance),
	)
	processors[utils.SECRET_SCAN] = NewBulkProcessor(
		utils.SECRET_SCAN,
		desWrapper(ingesters.CommitFuncSecrets),
	)
	processors[utils.SECRET_SCAN_STATUS] = NewBulkProcessor(
		utils.SECRET_SCAN_STATUS,
		desWrapper(ingesters.CommitFuncSecretScanStatus),
	)
	processors[utils.MALWARE_SCAN] = NewBulkProcessor(
		utils.MALWARE_SCAN,
		desWrapper(ingesters.CommitFuncMalware),
	)
	processors[utils.MALWARE_SCAN_STATUS] = NewBulkProcessor(
		utils.MALWARE_SCAN_STATUS,
		desWrapper(ingesters.CommitFuncMalwareScanStatus),
	)
	processors[utils.VULNERABILITY_SCAN_STATUS] = NewBulkProcessor(
		utils.VULNERABILITY_SCAN_STATUS,
		desWrapper(ingesters.CommitFuncVulnerabilitiesScanStatus),
	)
	processors[utils.COMPLIANCE_SCAN_STATUS] = NewBulkProcessor(
		utils.COMPLIANCE_SCAN_STATUS,
		desWrapper(ingesters.CommitFuncComplianceScanStatus),
	)
	processors[utils.CLOUD_COMPLIANCE_SCAN_STATUS] = NewBulkProcessor(
		utils.CLOUD_COMPLIANCE_SCAN_STATUS,
		desWrapper(ingesters.CommitFuncCloudComplianceScanStatus),
	)

	for i := range processors {
		processors[i].Start(ctx)
	}
}

func StopKafkaProcessors() {
	for i := range processors {
		processors[i].Stop()
	}
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
	processor, exists := processors[r.Topic]
	if !exists {
		log.Error().Msgf("Not Implemented for topic %s", r.Topic)
		return
	}

	// get tenant id from headers
	tenant := tenantID(r.Headers)

	err := Process(processor, tenant, r.Value)
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
		defer kc.Close()
		pollRecords(ctx, kc)
	}()

	return nil
}

func pollRecords(ctx context.Context, kc *kgo.Client) {
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("stop consuming from kafka")
			return
		default:
			records := kc.PollRecords(ctx, 1000)
			records.EachRecord(processRecord)
			records.EachError(
				func(s string, i int32, err error) {
					log.Error().Msgf("topic=%s partition=%d error: %s", s, i, err)
				},
			)
		}
	}
}
