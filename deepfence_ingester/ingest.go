package main

import (
	"context"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/twmb/franz-go/pkg/kgo"
)

func startKafkaConsumers(
	ctx context.Context,
	brokers string,
	topics []string,
	group string,
) {

	log.Info("brokers: ", brokers)
	log.Info("topics: ", topics)
	log.Info("group ID: ", group)

	opts := []kgo.Opt{
		kgo.SeedBrokers(strings.Split(brokers, ",")...),
		kgo.ConsumerGroup(group),
		kgo.ConsumeTopics(topics...),
		kgo.ClientID(group),
		kgo.FetchMinBytes(1e3),
		kgo.WithLogger(kgoLogger),
	}

	kc, err := kgo.NewClient(opts...)
	if err != nil {
		log.Error(err)
	}
	defer kc.Close()

	if err := kc.Ping(ctx); err != nil {
		log.Error(err)
	}

	for {
		select {
		case <-ctx.Done():
			log.Info("stop consuming from kafka")
			return
		default:
			records := kc.PollRecords(ctx, 1000)
			records.EachRecord(processRecord)
			records.EachError(func(s string, i int32, err error) {
				log.Errorf("topic=%s partition=%d error: %s", s, i, err)
			},
			)
		}
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
	// get tenant id from headers
	tenant := tenantID(r.Headers)

	switch r.Topic {
	case utils.VULNERABILITY_SCAN:
		vulnerabilitiesProcessed.Inc()
		cveProcessor.processCVE(tenant, r.Value)

	case utils.SECRET_SCAN:
		secretProcessed.Inc()
		secretsProcessor.processSecrets(tenant, r.Value)

	case utils.COMPLIANCE_SCAN:
		complianceProcessed.Inc()
		complianceProcessor.processCompliance(tenant, r.Value)

	case utils.CLOUD_COMPLIANCE_SCAN:
		cloudComplianceProcessed.Inc()
		cloudComplianceProcessor.processCloudCompliance(tenant, r.Value)

	default:
		log.Errorf("Not Implemented for topic %s", r.Topic)
	}
}
