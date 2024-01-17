package router

import (
	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

type Collector struct {
	activeAgents *prometheus.Desc
	activeUsers  *prometheus.Desc
}

func newCollector() *Collector {
	return &Collector{
		activeAgents: prometheus.NewDesc(
			"active_agents_total",
			"number of agents connected to console",
			[]string{"node_type", "namespace"}, nil,
		),
		activeUsers: prometheus.NewDesc(
			"active_users_total",
			"number of users in the console",
			nil, nil,
		),
	}
}

func (collector *Collector) Describe(ch chan<- *prometheus.Desc) {
	ch <- collector.activeAgents
	ch <- collector.activeUsers
}

func (collector *Collector) Collect(ch chan<- prometheus.Metric) {
	ctx := directory.NewContextWithNameSpace(directory.NonSaaSDirKey)

	// get number of agents connected
	counts, err := reporters_search.CountNodes(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to fetch nodes count for metrics")
	} else {
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.CloudProviders), "cloud_provider", "default")
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.Host), "host", "default")
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.Container), "container", "default")
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.ContainerImage), "container_image", "default")
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.Pod), "pod", "default")
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.KubernetesCluster), "kubernetes_cluster", "default")
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.Namespace), "kubernetes_namespace", "default")
	}

	// get number of users
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to fetch users count for metrics")
		return
	}

	users, err := pgClient.GetUsers(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to fetch users count for metrics")
	} else {
		ch <- prometheus.MustNewConstMetric(collector.activeUsers, prometheus.GaugeValue, float64(len(users)))
	}

}

func NewMetrics() *prometheus.Registry {
	// prometheus metrics
	registry := prometheus.NewRegistry()
	registry.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
		newCollector(),
	)

	return registry
}
