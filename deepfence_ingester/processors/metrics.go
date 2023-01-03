package processors

import (
	"context"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

var (
	publishElasticSearch = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "publish_es_total",
		Help: "Total number of records sent successfully to elasticsearch",
	}, []string{"status"})
	topicLag = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "consumer_group_lag",
		Help: "Consumer group lag per topic",
	}, []string{"topic"})
	vulnerabilitiesMasked = promauto.NewCounter(prometheus.CounterOpts{
		Name: "cve_masked_total",
		Help: "Total number of cve records masked",
	})
	vulnerabilitiesProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "cve_scan_total",
		Help: "Total number of cve records processed",
	})
	vulnerabilityLogsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "cve_scan_logs_total",
		Help: "Total number of cve log records processed",
	})
	secretProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "secret_scan_total",
		Help: "Total number of secret scan records processed",
	})
	secretLogsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "secret_scan_logs_total",
		Help: "Total number of secret scan log records processed",
	})
	malwareProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "malware_scan_total",
		Help: "Total number of malware scan records processed",
	})
	malwareLogsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "malware_scan_logs_total",
		Help: "Total number of malware scan log records processed",
	})
	sbomArtifactsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "sbom_artifacts_total",
		Help: "Total number of sbom artifacts processed",
	})
	sbomCveProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "sbom_cve_total",
		Help: "Total number of sbom cve records processed",
	})
	cloudComplianceProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "cloud_compliance_scan_total",
		Help: "Total number of cloud compliance scan records processed",
	})
	cloudComplianceLogsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "cloud_compliance_scan_logs_total",
		Help: "Total number of cloud compliance scan log records processed",
	})
	complianceProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "compliance_scan_total",
		Help: "Total number of compliance scan records processed",
	})
	complianceLogsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "compliance_scan_logs_total",
		Help: "Total number of compliance scan log records processed",
	})
	cloudTrailAlertsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "cloud_trail_alerts_total",
		Help: "Total number of cloud trail alert records processed",
	})
)

func StartGetLagByTopic(ctx context.Context, kafkaBrokers []string, groupID string, kgoLogger kgo.Logger) error {
	opts := []kgo.Opt{
		kgo.SeedBrokers(kafkaBrokers...),
		kgo.WithLogger(kgoLogger),
	}
	client, err := kgo.NewClient(opts...)
	if err != nil {
		return err
	}

	if err := client.Ping(ctx); err != nil {
		client.Close()
		return err
	}

	go func() {
		admin := kadm.NewClient(client)
		defer admin.Close()
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
	loop:
		for {
			select {
			case <-ctx.Done():
				log.Info().Msg("stop collecting consumer log")
				break loop
			case <-ticker.C:
				described, err := admin.DescribeGroups(ctx, groupID)
				if err != nil {
					log.Error().Msgf("%v", err)
					continue
				}
				fetched, err := admin.FetchOffsets(ctx, groupID)
				if err != nil {
					log.Error().Msgf("%v", err)
					continue
				}
				toList := described.AssignedPartitions()
				toList.Merge(fetched.Offsets().TopicsSet())
				endOffsets, err := admin.ListEndOffsets(ctx, toList.Topics()...)
				if err != nil {
					log.Error().Msgf("%v", err)
					continue
				}
				lagByTopic := kadm.CalculateGroupLag(described[groupID], fetched, endOffsets).TotalByTopic()
				for k, v := range lagByTopic {
					log.Debug().Msgf("consumer group lag topic=%s lag=%d", k, v.Lag)
					topicLag.WithLabelValues(k).Set(float64(v.Lag))
				}
			}
		}
		client.Close()
	}()
	return nil
}
