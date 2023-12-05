package processors

import (
	"context"
	"encoding/json"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
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

func telemetryWrapper(task string, cf commitFn) commitFn {
	return func(ns string, data [][]byte) error {
		span := telemetry.NewSpan(context.Background(), "kafka-jobs", task)
		defer span.End()
		err := cf(ns, data)
		if err != nil {
			span.EndWithErr(err)
		}
		return err
	}
}

func StartKafkaProcessors(ctx context.Context) {
	processors = map[string]*BulkProcessor{}

	processors[utils.VulnerabilityScan] = NewBulkProcessor(
		utils.VulnerabilityScan,
		telemetryWrapper(utils.VulnerabilityScan,
			desWrapper(ingesters.CommitFuncVulnerabilities)),
	)
	processors[utils.ComplianceScan] = NewBulkProcessor(
		utils.ComplianceScan,
		telemetryWrapper(utils.ComplianceScan,
			desWrapper(ingesters.CommitFuncCompliance)),
	)
	processors[utils.CloudComplianceScan] = NewBulkProcessor(
		utils.CloudComplianceScan,
		telemetryWrapper(utils.CloudComplianceScan,
			desWrapper(ingesters.CommitFuncCloudCompliance)),
	)
	processors[utils.SecretScan] = NewBulkProcessor(
		utils.SecretScan,
		telemetryWrapper(utils.SecretScan,
			desWrapper(ingesters.CommitFuncSecrets)),
	)
	processors[utils.MalwareScan] = NewBulkProcessor(
		utils.MalwareScan,
		telemetryWrapper(utils.MalwareScan,
			desWrapper(ingesters.CommitFuncMalware)),
	)
	processors[utils.VulnerabilityScanStatus] = NewBulkProcessor(
		utils.VulnerabilityScanStatus,
		telemetryWrapper(utils.VulnerabilityScanStatus,
			desWrapper(ingesters.CommitFuncStatus[ingestersUtil.VulnerabilityScanStatus](utils.NEO4JVulnerabilityScan))),
	)
	processors[utils.ComplianceScanStatus] = NewBulkProcessor(
		utils.ComplianceScanStatus,
		telemetryWrapper(utils.ComplianceScanStatus,
			desWrapper(ingesters.CommitFuncStatus[ingestersUtil.ComplianceScanStatus](utils.NEO4JComplianceScan))),
	)
	processors[utils.SecretScanStatus] = NewBulkProcessor(
		utils.SecretScanStatus,
		telemetryWrapper(utils.SecretScanStatus,
			desWrapper(ingesters.CommitFuncStatus[ingestersUtil.SecretScanStatus](utils.NEO4JSecretScan))),
	)
	processors[utils.MalwareScanStatus] = NewBulkProcessor(
		utils.MalwareScanStatus,
		telemetryWrapper(utils.MalwareScanStatus,
			desWrapper(ingesters.CommitFuncStatus[ingestersUtil.MalwareScanStatus](utils.NEO4JMalwareScan))),
	)
	processors[utils.CloudComplianceScanStatus] = NewBulkProcessor(
		utils.CloudComplianceScanStatus,
		telemetryWrapper(utils.CloudComplianceScanStatus,
			desWrapper(ingesters.CommitFuncStatus[ingestersUtil.CloudComplianceScanStatus](utils.NEO4JCloudComplianceScan))),
	)
	processors[utils.CloudResource] = NewBulkProcessorWith(
		utils.CloudResource,
		telemetryWrapper(utils.CloudResource,
			desWrapper(ingesters.CommitFuncCloudResource)),
		1_000)

	for i := range processors {
		err := processors[i].Start(ctx)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func StopKafkaProcessors() {
	for i := range processors {
		_ = processors[i].Stop()
	}
}

func getNamespace(rh []kgo.RecordHeader) string {
	for _, h := range rh {
		if h.Key == "namespace" {
			return string(h.Value)
		}
	}
	return ""
}

func processRecord(r *kgo.Record) {
	switch r.Topic {
	case utils.AuditLogs:
		addAuditLog(r)
	default:
		processor, exists := processors[r.Topic]
		if !exists {
			log.Error().Msgf("Not Implemented for topic %s", r.Topic)
			return
		}

		// get tenant id from headers
		tenant := getNamespace(r.Headers)

		err := Process(processor, tenant, r.Value)
		if err != nil {
			log.Error().Msgf("Process err: %s", err)
		}
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
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
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
	ticker := time.NewTicker(5 * time.Second)
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("stop consuming from kafka")
			return
		case <-ticker.C:
			records := kc.PollRecords(ctx, 20_000)
			records.EachRecord(processRecord)
			records.EachError(
				func(s string, i int32, err error) {
					log.Error().Msgf("topic=%s partition=%d error: %s", s, i, err)
				},
			)
		}
	}
}
