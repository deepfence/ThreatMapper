package main

import (
	"context"
	"strings"

	"github.com/twmb/franz-go/pkg/kgo"
)

const (
	cve                     = "cve"
	cveScanLogs             = "cve-scan"
	secretScan              = "secret-scan"
	secretScanLogs          = "secret-scan-logs"
	malwareScan             = "malware-scan"
	malwareScanLogs         = "malware-scan-logs"
	sbomArtifacts           = "sbom-artifact"
	sbomCVEScan             = "sbom-cve-scan"
	cloudComplianceScan     = "cloud-compliance-scan"
	cloudComplianceScanLogs = "cloud-compliance-scan-logs"
	complianceScan          = "compliance"
	complianceScanLogs      = "compliance-scan-logs"
	cloudTrailAlerts        = "cloudtrail-alert"
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

	kClient, err := kgo.NewClient(opts...)
	if err != nil {
		log.Error(err)
	}
	defer kClient.Close()

	if err := kClient.Ping(ctx); err != nil {
		log.Error(err)
	}

	for {
		select {
		case <-ctx.Done():
			log.Info("stop consuming from kafka")
			return
		default:
			records := kClient.PollRecords(ctx, 1000)
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
	case cve:
		cveProcessed.Inc()
		cveProcessor.processCVE(tenant, r.Value)

	case secretScan:
		secretProcessed.Inc()
		secretsProcessor.processSecrets(tenant, r.Value)

	case complianceScan:
		complianceProcessed.Inc()
		complianceProcessor.processCompliance(tenant, r.Value)

	case cloudComplianceScan:
		cloudComplianceProcessed.Inc()
		cloudComplianceProcessor.processCloudCompliance(tenant, r.Value)

	default:
		log.Error("Not Implemented")
	}
}
