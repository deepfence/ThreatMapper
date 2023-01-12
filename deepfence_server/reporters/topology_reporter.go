package reporters

import (
	"bytes"
	"context"
	"reflect"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type neo4jTopologyReporter struct {
	driver neo4j.Driver
}

func (nc *neo4jTopologyReporter) GetConnections(tx neo4j.Transaction) ([]ConnectionSummary, error) {

	r, err := tx.Run(`
	MATCH (n:Node) -[r:CONNECTS]-> (m:Node) 
	WITH coalesce(n.kubernete_cluster_name, '') <> '' AS is_kub, n, m, r
	RETURN n.cloud_provider, CASE WHEN is_kub THEN n.kubernetes_cluster_name ELSE n.cloud_region END, n.node_id, r.left_pid, m.cloud_provider, m.cloud_region, m.node_id, r.right_pid`, nil)

	if err != nil {
		return []ConnectionSummary{}, err
	}
	edges, err := r.Collect()

	if err != nil {
		return []ConnectionSummary{}, err
	}

	res := []ConnectionSummary{}
	var buf bytes.Buffer
	for _, edge := range edges {
		if edge.Values[2].(string) != edge.Values[6].(string) {
			buf.Reset()
			buf.WriteString(edge.Values[0].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[1].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[2].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[3].(string))
			src := buf.String()
			buf.Reset()
			buf.WriteString(edge.Values[4].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[5].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[6].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[7].(string))
			target := buf.String()
			res = append(res, ConnectionSummary{Source: src, Target: target})
		}
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getCloudProviders(tx neo4j.Transaction) ([]string, error) {
	res := []string{}
	r, err := tx.Run(`
		MATCH (n:Node) 
		WHERE n.cloud_provider <> 'internet' return n.cloud_provider`, nil)

	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		res = append(res, record.Values[0].(string))
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getCloudRegions(tx neo4j.Transaction, cloud_provider []string) (map[string][]string, error) {
	res := map[string][]string{}
	r, err := tx.Run(`
		MATCH (n:Node) 
		WHERE n.kubernetes_cluster_name = "" 
		AND CASE WHEN $providers IS NULL THEN [1] ELSE n.cloud_provider IN $providers END 
		RETURN n.cloud_provider, n.cloud_region`,
		filterNil(map[string]interface{}{"providers": cloud_provider}))

	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		provider := record.Values[0].(string)
		region := record.Values[1].(string)
		if _, present := res[provider]; !present {
			res[provider] = []string{}
		}
		res[provider] = append(res[provider], region)
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getCloudKubernetes(tx neo4j.Transaction, cloud_provider []string) (map[string][]string, error) {
	res := map[string][]string{}
	r, err := tx.Run(`
		MATCH (n:Node) 
		WHERE CASE WHEN $providers IS NULL THEN [1] ELSE n.cloud_provider IN $providers END
		RETURN n.cloud_provider, n.kubernetes_cluster_name`,
		filterNil(map[string]interface{}{"providers": cloud_provider}))

	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		provider := record.Values[0].(string)
		region := record.Values[1].(string)
		if _, present := res[provider]; !present {
			res[provider] = []string{}
		}
		res[provider] = append(res[provider], region)
	}

	return res, nil
}

func filterNil(params map[string]interface{}) map[string]interface{} {
	for k, v := range params {
		if reflect.ValueOf(v).IsNil() {
			params[k] = nil
		}
	}
	return params
}

func (nc *neo4jTopologyReporter) getHosts(tx neo4j.Transaction, cloud_provider, cloud_regions, cloud_kubernetes []string) (map[string][]string, error) {
	res := map[string][]string{}

	r, err := tx.Run(`
		MATCH (n:Node) 
		WITH coalesce(n.kubernete_cluster_name, '') <> '' AS is_kub, n
		WHERE CASE WHEN $providers IS NULL THEN [1] ELSE n.cloud_provider IN $providers END
		AND CASE WHEN is_kub THEN
		    CASE WHEN $kubernetes IS NULL THEN [1] ELSE n.kubernetes_cluster_name IN $kubernetes END
		ELSE
		    CASE WHEN $regions IS NULL THEN [1] ELSE n.cloud_region IN $regions END
		END
		RETURN n.cloud_provider, CASE WHEN is_kub THEN n.kubernetes_cluster_name ELSE n.cloud_region END, n.node_id`,
		filterNil(map[string]interface{}{"providers": cloud_provider, "regions": cloud_regions, "kubernetes": cloud_kubernetes}))
	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		//provider := record.Values[0].(string)
		region := record.Values[1].(string)
		host_id := record.Values[2].(string)
		if _, present := res[region]; !present {
			res[region] = []string{}
		}

		res[region] = append(res[region], host_id)
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getProcesses(tx neo4j.Transaction, hosts []string) (map[string][]string, error) {
	res := map[string][]string{}

	r, err := tx.Run(`
		MATCH (n:Node)
		WHERE n.host_name IN $hosts WITH n 
		MATCH (n)-[:HOSTS]->(m:Process) 
		RETURN n.node_id, m.node_id`,
		map[string]interface{}{"hosts": hosts})
	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		host_id := record.Values[0].(string)
		process_id := record.Values[1].(string)
		if _, present := res[host_id]; !present {
			res[host_id] = []string{}
		}
		res[host_id] = append(res[host_id], process_id)
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getPods(tx neo4j.Transaction, hosts []string) (map[string][]string, error) {
	res := map[string][]string{}

	r, err := tx.Run(`
		MATCH (n:Container) 
		WHERE CASE WHEN $hosts IS NULL THEN [1] ELSE n.host_name IN $hosts END
		RETURN n.host_name, n.`+"`docker_label_io.kubernetes.pod.name`",
		filterNil(map[string]interface{}{"hosts": hosts}))
	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		host_id := record.Values[0].(string)
		pod_id := record.Values[1].(string)
		if _, present := res[host_id]; !present {
			res[host_id] = []string{}
		}
		res[host_id] = append(res[host_id], pod_id)
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getContainers(tx neo4j.Transaction, hosts, pods []string) (map[string][]string, error) {
	res := map[string][]string{}

	r, err := tx.Run(`
		MATCH (n:Node) 
		WHERE CASE WHEN $hosts IS NULL THEN [1] ELSE n.host_name IN $hosts END
		WITH n 
		MATCH (n)-[:HOSTS]->(m:Container)
		RETURN n.node_id, m.node_id`,
		filterNil(map[string]interface{}{"hosts": hosts}))
	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		host_id := record.Values[0].(string)
		container_id := record.Values[1].(string)
		if _, present := res[host_id]; !present {
			res[host_id] = []string{}
		}
		res[host_id] = append(res[host_id], container_id)
	}

	r, err = tx.Run(`
		MATCH (n:Container) 
		WHERE CASE WHEN $pods IS NULL THEN [1] ELSE n.`+"`docker_label_io.kubernetes.pod.name`"+`IN $pods END
		RETURN n.`+"`docker_label_io.kubernetes.pod.name`"+`, n.node_id`,
		filterNil(map[string]interface{}{"pods": pods}))
	if err != nil {
		return res, err
	}
	records, err = r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		host_id := record.Values[0].(string)
		container_id := record.Values[1].(string)
		if _, present := res[host_id]; !present {
			res[host_id] = []string{}
		}
		res[host_id] = append(res[host_id], container_id)
	}

	return res, nil
}

type ConnectionSummary struct {
	Source string `json:"source" required:"true"`
	Target string `json:"target" required:"true"`
}

type RenderedGraph struct {
	Hosts       map[string][]string `json:"hosts" required:"true"`
	Processes   map[string][]string `json:"processes" required:"true"`
	Pods        map[string][]string `json:"pods" required:"true"`
	Containers  map[string][]string `json:"containers" required:"true"`
	Providers   []string            `json:"providers" required:"true"`
	Regions     map[string][]string `json:"regions" required:"true"`
	Kubernetes  map[string][]string `json:"kubernetes" required:"true"`
	Connections []ConnectionSummary `json:"connections" required:"true"`
}

type TopologyFilters struct {
	CloudFilter      []string `json:"cloud_filter" required:"true"`
	RegionFilter     []string `json:"region_filter" required:"true"`
	KubernetesFilter []string `json:"kubernetes_filter" required:"true"`
	HostFilter       []string `json:"host_filter" required:"true"`
	PodFilter        []string `json:"pod_filter" required:"true"`
}

func (nc *neo4jTopologyReporter) GetHostGraph(ctx context.Context, host_filter, pod_filter []string) (RenderedGraph, error) {
	res := RenderedGraph{}

	session, err := nc.driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	res.Connections, err = nc.GetConnections(tx)
	if err != nil {
		return res, err
	}
	res.Hosts, err = nc.getHosts(tx, nil, nil, nil)
	if err != nil {
		return res, err
	}
	res.Processes, err = nc.getProcesses(tx, host_filter)
	if err != nil {
		return res, err
	}
	res.Pods, err = nc.getPods(tx, host_filter)
	if err != nil {
		return res, err
	}
	res.Containers, err = nc.getContainers(tx, host_filter, pod_filter)
	if err != nil {
		return res, err
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) GetGraph(ctx context.Context, cloud_filter, region_filter, kubernetes_filter, host_filter, pod_filter []string) (RenderedGraph, error) {
	res := RenderedGraph{}

	session, err := nc.driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	res.Connections, err = nc.GetConnections(tx)
	if err != nil {
		return res, err
	}
	res.Providers, err = nc.getCloudProviders(tx)
	if err != nil {
		return res, err
	}
	res.Regions, err = nc.getCloudRegions(tx, cloud_filter)
	if err != nil {
		return res, err
	}
	res.Kubernetes, err = nc.getCloudKubernetes(tx, cloud_filter)
	if err != nil {
		return res, err
	}
	res.Hosts, err = nc.getHosts(tx, cloud_filter, region_filter, kubernetes_filter)
	if err != nil {
		return res, err
	}
	res.Processes, err = nc.getProcesses(tx, host_filter)
	if err != nil {
		return res, err
	}
	res.Pods, err = nc.getPods(tx, host_filter)
	if err != nil {
		return res, err
	}
	res.Containers, err = nc.getContainers(tx, host_filter, pod_filter)
	if err != nil {
		return res, err
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) Graph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
	return nc.GetGraph(ctx, filters.CloudFilter, filters.RegionFilter, filters.KubernetesFilter, filters.HostFilter, filters.PodFilter)
}

func (nc *neo4jTopologyReporter) HostGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
	return nc.GetHostGraph(ctx, filters.HostFilter, filters.PodFilter)
}

func NewNeo4jCollector(ctx context.Context) (TopologyReporter, error) {
	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return nil, err
	}

	nc := &neo4jTopologyReporter{
		driver: driver,
	}

	return nc, nil
}
