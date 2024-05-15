package router

import (
	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

type Collector struct {
	activeAgents    *prometheus.Desc
	activeUsers     *prometheus.Desc
	userInfo        *prometheus.Desc
	neo4jNodesCount *prometheus.Desc
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
			[]string{"namespace"}, nil,
		),
		userInfo: prometheus.NewDesc(
			"active_users_info",
			"users info",
			[]string{"namespace", "company"}, nil,
		),
		neo4jNodesCount: prometheus.NewDesc(
			"neo4j_node_label_count",
			"all neo4j nodes count",
			[]string{"label", "namespace"}, nil,
		),
	}
}

func (collector *Collector) Describe(ch chan<- *prometheus.Desc) {
	ch <- collector.activeAgents
	ch <- collector.activeUsers
	ch <- collector.userInfo
	ch <- collector.neo4jNodesCount
}

func (collector *Collector) Collect(ch chan<- prometheus.Metric) {
	ctx := directory.NewContextWithNameSpace(directory.NonSaaSDirKey)
	ns := string(directory.NonSaaSDirKey)

	// get number of agents connected
	counts, err := reporters_search.CountNodes(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to fetch nodes count for metrics")
	} else {
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.CloudProviders), "cloud_provider", ns)
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.Host), "host", ns)
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.Container), "container", ns)
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.ContainerImage), "container_image", ns)
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.Pod), "pod", ns)
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.KubernetesCluster), "kubernetes_cluster", ns)
		ch <- prometheus.MustNewConstMetric(collector.activeAgents, prometheus.GaugeValue,
			float64(counts.Namespace), "kubernetes_namespace", ns)
	}

	allNodes, err := reporters_search.CountAllNodeLabels(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to fetch all nodes count for metrics")
	} else {
		for k, v := range allNodes {
			ch <- prometheus.MustNewConstMetric(collector.neo4jNodesCount, prometheus.GaugeValue,
				float64(v), k, ns)
		}
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
		ch <- prometheus.MustNewConstMetric(collector.activeUsers, prometheus.GaugeValue, float64(len(users)), ns)
		if len(users) > 0 {
			ch <- prometheus.MustNewConstMetric(collector.userInfo, prometheus.GaugeValue, 1.0, ns, users[0].CompanyName)
		}
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
