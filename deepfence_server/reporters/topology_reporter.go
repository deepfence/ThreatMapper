package reporters

import (
	"bytes"
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type neo4jTopologyReporter struct {
	driver *neo4j.Driver
}

func (nc *neo4jTopologyReporter) GetConnections(tx neo4j.Transaction) ([]ConnectionSummary, error) {

	r, err := tx.Run("MATCH (n:Node) -[r:CONNECTS]-> (m:Node) return n.cloud_provider, n.cloud_region, n.node_id, r.left_pid, m.cloud_provider, m.cloud_region, m.node_id, r.right_pid", nil)

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
	r, err := tx.Run("MATCH (n:Node) where n.cloud_provider <> 'internet' return n.cloud_provider", nil)

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
	r, err := tx.Run("MATCH (n:Node) WHERE n.cloud_provider IN $providers RETURN n.cloud_provider, n.cloud_region", map[string]interface{}{"providers": cloud_provider})

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

func (nc *neo4jTopologyReporter) getHosts(tx neo4j.Transaction, cloud_provider []string, cloud_regions []string) (map[string]map[string][]string, error) {
	res := map[string]map[string][]string{}

	r, err := tx.Run("MATCH (n:Node) WHERE n.cloud_provider IN $providers AND n.cloud_region IN $regions return n.cloud_provider, n.cloud_region, n.node_id", map[string]interface{}{"providers": cloud_provider, "regions": cloud_regions})
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
		host_id := record.Values[2].(string)
		if _, present := res[provider]; !present {
			res[provider] = map[string][]string{}
		}

		if _, present := res[provider][region]; !present {
			res[provider][region] = []string{}
		}

		res[provider][region] = append(res[provider][region], host_id)
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getProcesses(tx neo4j.Transaction, hosts []string) (map[string][]string, error) {
	res := map[string][]string{}

	r, err := tx.Run("MATCH (n:Node) WHERE n.host_name IN $hosts WITH n MATCH (n)-[:HOSTS]->(m:Process) return n.node_id, m.node_id", map[string]interface{}{"hosts": hosts})
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

	r, err := tx.Run("MATCH (n:Node) WHERE n.host_name IN $hosts WITH n MATCH (n)-[:HOSTS]->(m:Pod) return n.node_id, m.node_id", map[string]interface{}{"hosts": hosts})
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

func (nc *neo4jTopologyReporter) getContainers(tx neo4j.Transaction, hosts []string) (map[string][]string, error) {
	res := map[string][]string{}

	r, err := tx.Run("MATCH (n:Node) WHERE n.host_name IN $hosts WITH n MATCH (n)-[:HOSTS]->(m:Container) return n.node_id, m.node_id", map[string]interface{}{"hosts": hosts})
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

	return res, nil
}

type ConnectionSummary struct {
	Source string `json:"source"`
	Target string `json:"target"`
}

type RenderedGraph struct {
	Hosts       map[string]map[string][]string
	Processes   map[string][]string
	Pods        map[string][]string
	Containers  map[string][]string
	Providers   []string
	Regions     map[string][]string
	Connections []ConnectionSummary
}

type TopologyFilters struct {
	CloudFilter  []string
	RegionFilter []string
	HostFilter   []string
}

func (nc *neo4jTopologyReporter) GetGraph(ctx context.Context, cloud_filter, region_filter, host_filter []string) (RenderedGraph, error) {
	res := RenderedGraph{}

	session, err := (*nc.driver).Session(neo4j.AccessModeRead)
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
	res.Hosts, err = nc.getHosts(tx, cloud_filter, region_filter)
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
	res.Containers, err = nc.getContainers(tx, host_filter)
	if err != nil {
		return res, err
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) Graph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
	return nc.GetGraph(ctx, filters.CloudFilter, filters.RegionFilter, filters.HostFilter)
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
