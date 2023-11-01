package reporters_graph

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"reflect"
	"sort"
	"strconv"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/samber/mo"
)

const (
	cloud_resource_limit = 1000
)

type TopologyReporter interface {
	Graph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	HostGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	KubernetesGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	ContainerGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	PodGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	Close()
}

type neo4jTopologyReporter struct{}

type NodeID string

type NodeStub struct {
	ID   NodeID `json:"id"`
	Name string `json:"name"`
}

type ResourceStub struct {
	NodeStub
	ResourceType string   `json:"resource-type"`
	AccountId    string   `json:"account_id"`
	IDs          []NodeID `json:"ids"`
}

func (nc *neo4jTopologyReporter) GetProcessConnections(tx neo4j.Transaction, hosts []string) ([]ConnectionSummary, error) {

	res := []ConnectionSummary{}
	hosts = append(hosts, "in-the-internet")

	r, err := tx.Run(`
	MATCH (n:Node) -[r:CONNECTS]-> (m:Node)
	WHERE n.node_id IN $host_ids
	WITH CASE WHEN coalesce(n.kubernetes_cluster_id, '') <> ''
		THEN n.kubernetes_cluster_id
		ELSE n.cloud_region
	END AS left_region,
	n, m, r,
	CASE WHEN coalesce(m.kubernetes_cluster_id, '') <> ''
		THEN m.kubernetes_cluster_id
		ELSE m.cloud_region
	END AS right_region
	RETURN n.cloud_provider, left_region, n.node_id, r.left_pids,
		   m.cloud_provider, right_region, m.node_id, r.right_pids`,
		map[string]interface{}{"host_ids": hosts})

	if err != nil {
		return []ConnectionSummary{}, err
	}
	edges, err := r.Collect()

	if err != nil {
		return []ConnectionSummary{}, err
	}

	var buf bytes.Buffer
	for _, edge := range edges {
		if edge.Values[3] == nil || edge.Values[7] == nil {
			continue
		}
		if edge.Values[2].(string) != edge.Values[6].(string) {
			left_pids := edge.Values[3].([]interface{})
			right_pids := edge.Values[7].([]interface{})
			for i := range left_pids {
				buf.Reset()
				buf.WriteString(edge.Values[0].(string))
				buf.WriteByte(';')
				buf.WriteString(edge.Values[1].(string))
				buf.WriteByte(';')
				buf.WriteString(edge.Values[2].(string))
				buf.WriteByte(';')
				buf.WriteString(strconv.Itoa(int(left_pids[i].(int64))))
				src := buf.String()
				buf.Reset()
				buf.WriteString(edge.Values[4].(string))
				buf.WriteByte(';')
				buf.WriteString(edge.Values[5].(string))
				buf.WriteByte(';')
				buf.WriteString(edge.Values[6].(string))
				buf.WriteByte(';')
				buf.WriteString(strconv.Itoa(int(right_pids[i].(int64))))
				target := buf.String()
				res = append(res, ConnectionSummary{Source: src, Target: target})
			}
		}
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) GetHostConnections(tx neo4j.Transaction, region_k8s, not_hosts []string) ([]ConnectionSummary, error) {

	res := []ConnectionSummary{}
	if len(region_k8s) == 0 {
		return res, nil
	}

	r, err := tx.Run(`
	MATCH (c)
	WHERE c:KubernetesCluster or c:CloudRegion
	AND CASE WHEN $region_k8s IS NULL THEN true ELSE c.node_id IN $region_k8s END
	MATCH (c) -[:HOSTS]-> (n:Node)
	WHERE NOT CASE WHEN $not_hosts IS NULL THEN false ELSE n.node_id IN $not_hosts END
	MATCH (n) -[r:CONNECTS]-> (m:Node)
	RETURN n.cloud_provider, CASE WHEN coalesce(n.kubernetes_cluster_id, '') <> '' THEN n.kubernetes_cluster_id ELSE n.cloud_region END AS left_region, n.node_id,
		   m.cloud_provider, CASE WHEN coalesce(m.kubernetes_cluster_id, '') <> '' THEN m.kubernetes_cluster_id ELSE m.cloud_region END AS right_region, m.node_id`,
		map[string]interface{}{"region_k8s": region_k8s, "not_hosts": not_hosts})

	if err != nil {
		return []ConnectionSummary{}, err
	}
	edges, err := r.Collect()

	if err != nil {
		return []ConnectionSummary{}, err
	}

	var buf bytes.Buffer
	for _, edge := range edges {
		if edge.Values[2].(string) != edge.Values[5].(string) {
			buf.Reset()
			buf.WriteString(edge.Values[0].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[1].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[2].(string))
			buf.WriteByte(';')
			buf.WriteString(strconv.Itoa(0))
			src := buf.String()
			buf.Reset()
			buf.WriteString(edge.Values[3].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[4].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[5].(string))
			buf.WriteByte(';')
			buf.WriteString(strconv.Itoa(0))
			target := buf.String()
			res = append(res, ConnectionSummary{Source: src, Target: target})
		}
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) GetKubernetesClusterConnections(tx neo4j.Transaction, not_hosts []string) ([]ConnectionSummary, error) {

	res := []ConnectionSummary{}

	r, err := tx.Run(`
	MATCH (c:KubernetesCluster) -[:HOSTS]-> (n:Node)
	WHERE NOT CASE WHEN $not_hosts IS NULL THEN false ELSE n.node_id IN $not_hosts END
	MATCH (n) -[r:CONNECTS]-> (m:Node)
	RETURN n.cloud_provider, n.kubernetes_cluster_id, n.node_id,
		   m.cloud_provider, m.kubernetes_cluster_id, m.node_id`,
		map[string]interface{}{"not_hosts": not_hosts})

	if err != nil {
		return []ConnectionSummary{}, err
	}
	edges, err := r.Collect()

	if err != nil {
		return []ConnectionSummary{}, err
	}

	var buf bytes.Buffer
	for _, edge := range edges {
		if edge.Values[2].(string) != edge.Values[5].(string) {
			buf.Reset()
			buf.WriteString(edge.Values[0].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[1].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[2].(string))
			buf.WriteByte(';')
			buf.WriteString(strconv.Itoa(0))
			src := buf.String()
			buf.Reset()
			buf.WriteString(edge.Values[3].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[4].(string))
			buf.WriteByte(';')
			buf.WriteString(edge.Values[5].(string))
			buf.WriteByte(';')
			buf.WriteString(strconv.Itoa(0))
			target := buf.String()
			res = append(res, ConnectionSummary{Source: src, Target: target})
		}
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) GetRegionClusterConnections(tx neo4j.Transaction, cloud_provider, not_region_cluster []string) ([]ConnectionSummary, error) {

	res := []ConnectionSummary{}
	if len(cloud_provider) == 0 {
		return res, nil
	}

	r, err := tx.Run(`
	MATCH (p:CloudProvider) -[:HOSTS]-> (c)
	WHERE CASE WHEN $cloud_providers IS NULL THEN true ELSE p.node_id IN $cloud_providers END
	AND (c:CloudRegion OR c:KubernetesCluster)
	AND NOT (CASE WHEN $not_region_cluster IS NULL THEN false ELSE c.node_id IN $not_region_cluster END)
	MATCH (c) -[:HOSTS]-> (n:Node)
	MATCH (n) -[:CONNECTS]-> (m:Node)
	RETURN distinct n.cloud_provider, CASE WHEN coalesce(n.kubernetes_cluster_id, '') <> '' THEN n.kubernetes_cluster_id ELSE n.cloud_region END AS left_region,
		            m.cloud_provider, CASE WHEN coalesce(m.kubernetes_cluster_id, '') <> '' THEN m.kubernetes_cluster_id ELSE m.cloud_region END AS right_region`,

		map[string]interface{}{"cloud_providers": cloud_provider, "not_region_cluster": not_region_cluster})

	if err != nil {
		return []ConnectionSummary{}, err
	}
	edges, err := r.Collect()

	if err != nil {
		return []ConnectionSummary{}, err
	}

	var buf bytes.Buffer
	for _, edge := range edges {
		buf.Reset()
		buf.WriteString(edge.Values[0].(string))
		buf.WriteByte(';')
		buf.WriteString(edge.Values[1].(string))
		buf.WriteByte(';')
		buf.WriteString("")
		buf.WriteByte(';')
		buf.WriteString(strconv.Itoa(0))
		src := buf.String()
		buf.Reset()
		buf.WriteString(edge.Values[2].(string))
		buf.WriteByte(';')
		buf.WriteString(edge.Values[3].(string))
		buf.WriteByte(';')
		buf.WriteString("")
		buf.WriteByte(';')
		buf.WriteString(strconv.Itoa(0))
		target := buf.String()
		res = append(res, ConnectionSummary{Source: src, Target: target})
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) GetConnections(tx neo4j.Transaction,
	cloud_provider,
	cloud_region,
	k8s_cluster,
	hosts []string) ([]ConnectionSummary, error) {

	start := time.Now()
	res := []ConnectionSummary{}
	proc_conn, err := nc.GetProcessConnections(tx, hosts)
	if err != nil {
		return res, err
	}
	log.Info().Msgf("Proc: %v / %v", time.Since(start), len(proc_conn))
	res = append(res, proc_conn...)
	host_conn, err := nc.GetHostConnections(tx, append(cloud_region, k8s_cluster...), hosts)
	if err != nil {
		return res, err
	}
	res = append(res, host_conn...)
	log.Info().Msgf("Hosts: %v / %v", time.Since(start), len(host_conn))
	rc_conn, err := nc.GetRegionClusterConnections(tx, cloud_provider, append(cloud_region, k8s_cluster...))
	if err != nil {
		return res, err
	}
	res = append(res, rc_conn...)
	log.Info().Msgf("RC: %v / %v", time.Since(start), len(rc_conn))

	return res, nil
}

func (nc *neo4jTopologyReporter) GetKubernetesConnections(tx neo4j.Transaction,
	k8s_cluster,
	hosts []string) ([]ConnectionSummary, error) {

	start := time.Now()
	res := []ConnectionSummary{}
	proc_conn, err := nc.GetProcessConnections(tx, hosts)
	if err != nil {
		return res, err
	}
	log.Info().Msgf("Proc: %v / %v", time.Since(start), len(proc_conn))
	res = append(res, proc_conn...)
	host_conn, err := nc.GetHostConnections(tx, k8s_cluster, hosts)
	if err != nil {
		return res, err
	}
	res = append(res, host_conn...)
	log.Info().Msgf("Hosts: %v / %v", time.Since(start), len(host_conn))
	rc_conn, err := nc.GetKubernetesClusterConnections(tx, hosts)
	if err != nil {
		return res, err
	}
	res = append(res, rc_conn...)
	log.Info().Msgf("K8s: %v / %v", time.Since(start), len(rc_conn))

	return res, nil
}

func nodeIds2nodeId(node_ids []NodeID) string {
	h := sha256.New()
	v := []string{}
	for i := range node_ids {
		v = append(v, string(node_ids[i]))
	}
	sort.Strings(v)

	for _, s := range v {
		h.Write([]byte(s))
	}
	return hex.EncodeToString(h.Sum(nil))
}

func (nc *neo4jTopologyReporter) GetNonPublicCloudResources(
	tx neo4j.Transaction,
	cloud_provider []string,
	cloud_regions []string,
	cloud_services []string,
	fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]ResourceStub, error) {
	res := map[NodeID][]ResourceStub{}
	r, err := tx.Run(`
		MATCH (s:CloudResource)
		WHERE s.depth IS NULL
		AND CASE WHEN $services IS NULL THEN [1] ELSE s.node_type IN $services END
		AND CASE WHEN $providers IS NULL THEN [1] ELSE s.cloud_provider IN $providers END
		AND CASE WHEN $regions IS NULL THEN [1] ELSE s.region IN $regions END `+
		reporters.ParseFieldFilters2CypherWhereConditions("s", fieldfilters, false)+`
		RETURN collect(s.node_id),s.cloud_provider,s.region,s.account_id,s.node_type`,
		filterNil(map[string]interface{}{
			"providers": cloud_provider,
			"services":  cloud_services,
			"regions":   cloud_regions,
		}))
	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		//provider := record.Values[0].(string)
		if record.Values[0] == nil || record.Values[1] == nil {
			continue
		}
		node_ids := extractResourceNodeIds(record.Values[0].([]interface{}))
		region := NodeID(record.Values[2].(string))
		account_id := NodeID(record.Values[3].(string))
		node_type := NodeID(record.Values[4].(string))
		key := NodeID(string(region) + ":" + string(node_type))
		if _, present := res[key]; !present {
			res[key] = []ResourceStub{}
		}

		res[key] = append(res[key], ResourceStub{
			NodeStub: NodeStub{
				ID:   NodeID(nodeIds2nodeId(node_ids)),
				Name: string(node_type),
			},
			IDs:          node_ids,
			ResourceType: string(node_type),
			AccountId:    string(account_id),
		})
	}
	return res, nil

}

func extractResourceNodeIds(ids []interface{}) []NodeID {
	res := []NodeID{}
	for i := range ids {
		res = append(res, NodeID(ids[i].(string)))
	}
	return res
}

func (nc *neo4jTopologyReporter) GetCloudServices(
	tx neo4j.Transaction,
	cloud_provider []string,
	cloud_regions []string,
	fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]ResourceStub, error) {

	res := map[NodeID][]ResourceStub{}
	r, err := tx.Run(`
		MATCH (cp: CloudProvider)
		WHERE CASE WHEN $providers IS NULL THEN true ELSE cp.node_id IN $providers END
		MATCH (cp) -[:HOSTS]-> (cr: CloudRegion)
		WHERE CASE WHEN $regions IS NULL THEN true ELSE cr.node_id IN $regions END
		MATCH (cr) -[:HOSTS]-> (s:CloudResource)
		WITH s LIMIT `+strconv.Itoa(cloud_resource_limit)+`
		WHERE s.node_type IN $resource_types `+
		reporters.ParseFieldFilters2CypherWhereConditions("s", fieldfilters, false)+`
		RETURN collect(s.node_id), s.cloud_region, s.node_type`,
		filterNil(map[string]interface{}{
			"providers":      cloud_provider,
			"regions":        cloud_regions,
			"resource_types": ingestersUtil.TopologyCloudResourceTypes,
		}))

	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		node_ids := extractResourceNodeIds(record.Values[0].([]interface{}))
		region := record.Values[1].(string)
		service := record.Values[2].(string)

		res[NodeID(region)] = append(res[NodeID(region)],
			ResourceStub{
				NodeStub: NodeStub{
					ID:   NodeID(nodeIds2nodeId(node_ids)),
					Name: service,
				},
				IDs:          node_ids,
				ResourceType: service,
			})
	}
	return res, nil

}

func (nc *neo4jTopologyReporter) GetPublicCloudResources(
	tx neo4j.Transaction,
	cloud_provider []string,
	cloud_regions []string,
	cloud_services []string,
	fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]ResourceStub, error) {
	res := map[NodeID][]ResourceStub{}
	r, err := tx.Run(`
		MATCH (cp: CloudProvider)
		WHERE CASE WHEN $providers IS NULL THEN [1] ELSE cp.node_id IN $providers END
		MATCH (cp) -[:HOSTS]-> (cr: CloudRegion)
		WHERE CASE WHEN $regions IS NULL THEN [1] ELSE cr.node_id IN $regions END
		MATCH (cr) -[:HOSTS]-> (s:CloudResource)
		MATCH (s:CloudResource)
		WHERE s.depth IS NOT NULL
		AND CASE WHEN $services IS NULL THEN [1] ELSE s.node_type IN $services END
		AND CASE WHEN $providers IS NULL THEN [1] ELSE s.cloud_provider IN $providers END
		AND CASE WHEN $regions IS NULL THEN [1] ELSE s.region IN $regions END`+
		reporters.ParseFieldFilters2CypherWhereConditions("s", fieldfilters, false)+`
		RETURN collect(s.node_id),s.cloud_provider,s.region,s.account_id,s.node_type`,
		filterNil(map[string]interface{}{
			"providers": cloud_provider,
			"services":  cloud_services,
			"regions":   cloud_regions,
		}))
	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		//provider := record.Values[0].(string)
		if record.Values[0] == nil || record.Values[1] == nil {
			continue
		}
		node_ids := extractResourceNodeIds(record.Values[0].([]interface{}))
		region := NodeID(record.Values[2].(string))
		account_id := NodeID(record.Values[3].(string))
		node_type := NodeID(record.Values[4].(string))
		key := NodeID(string(region) + ":" + string(node_type))
		if _, present := res[key]; !present {
			res[key] = []ResourceStub{}
		}

		res[key] = append(res[key], ResourceStub{
			NodeStub: NodeStub{
				ID:   NodeID(nodeIds2nodeId(node_ids)),
				Name: string(node_type),
			},
			IDs:          node_ids,
			ResourceType: string(node_type),
			AccountId:    string(account_id),
		})
	}
	return res, nil

}

func (nc *neo4jTopologyReporter) getCloudProviders(tx neo4j.Transaction) ([]NodeStub, error) {
	res := []NodeStub{}
	r, err := tx.Run(`
		MATCH (n:CloudProvider)
		WHERE n.active = true
		RETURN n.node_id`, nil)

	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		name := record.Values[0].(string)
		res = append(res, NodeStub{NodeID(name), name})
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getCloudRegions(tx neo4j.Transaction, cloud_provider []string) (map[NodeID][]NodeStub, error) {
	res := map[NodeID][]NodeStub{}
	r, err := tx.Run(`
		MATCH (cr:CloudProvider)
		WHERE CASE WHEN $providers IS NULL THEN [1] ELSE cr.node_id IN $providers END
		MATCH (cr) -[:HOSTS]-> (n:CloudRegion)
		WHERE n.active = true
		RETURN cr.node_id, n.node_id`,
		filterNil(map[string]interface{}{"providers": cloud_provider}))

	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		provider := NodeID(record.Values[0].(string))
		region := NodeID(record.Values[1].(string))
		if _, present := res[provider]; !present {
			res[provider] = []NodeStub{}
		}
		res[provider] = append(res[provider], NodeStub{ID: region, Name: string(region)})
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getCloudKubernetes(
	tx neo4j.Transaction,
	cloud_provider []string,
	fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]NodeStub, error) {
	res := map[NodeID][]NodeStub{}
	r, err := tx.Run(`
		MATCH (cr:CloudProvider)
		WHERE CASE WHEN $providers IS NULL THEN true ELSE cr.node_id IN $providers END
		MATCH (cr) -[:HOSTS]-> (n:KubernetesCluster)
		WHERE n.active = true
		WITH DISTINCT cr.node_id as cloud_provider, n
		`+reporters.ParseFieldFilters2CypherWhereConditions("n", fieldfilters, false)+`
		RETURN cloud_provider, n.node_id, n.node_name`,
		filterNil(map[string]interface{}{"providers": cloud_provider}))

	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		provider := NodeID(record.Values[0].(string))
		cluster := NodeID(record.Values[1].(string))
		name := record.Values[2].(string)
		if _, present := res[provider]; !present {
			res[provider] = []NodeStub{}
		}
		res[provider] = append(res[provider], NodeStub{ID: cluster, Name: name})
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

func (nc *neo4jTopologyReporter) getHosts(
	tx neo4j.Transaction,
	cloud_provider, cloud_regions, cloud_kubernetes []string,
	fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]NodeStub, error) {
	res := map[NodeID][]NodeStub{}

	query := `
	MATCH (cp: CloudProvider)
	WHERE CASE WHEN $providers IS NULL THEN true ELSE cp.node_id IN $providers END
	MATCH (cp) -[:HOSTS]-> (cr: CloudRegion)
	WHERE CASE WHEN $regions IS NULL THEN true ELSE cr.node_id IN $regions END
	MATCH (cr) -[:HOSTS]-> (n:Node)
	WHERE n.active = true
	AND n.kubernetes_cluster_id = ''
	` + reporters.ParseFieldFilters2CypherWhereConditions("n", fieldfilters, false) + `
	RETURN n.cloud_provider, n.cloud_region, n.node_id`

	params := filterNil(map[string]interface{}{"providers": cloud_provider, "regions": cloud_regions})

	r, err := tx.Run(query, params)
	if err != nil {
		return res, err
	}
	// log.Info().Msgf("get hosts query: %s params: %v", query, params)

	records, err := r.Collect()
	if err != nil {
		return res, err
	}

	for _, record := range records {
		//provider := record.Values[0].(string)
		if record.Values[1] == nil || record.Values[2] == nil {
			continue
		}
		parent := NodeID(record.Values[1].(string))
		host_id := NodeID(record.Values[2].(string))
		if _, present := res[parent]; !present {
			res[parent] = []NodeStub{}
		}

		res[parent] = append(res[parent], NodeStub{ID: host_id, Name: string(host_id)})
	}

	r, err = tx.Run(`
		MATCH (k:KubernetesCluster) -[:INSTANCIATE]-> (n:Node)
		WHERE CASE WHEN $kubernetes IS NULL THEN true ELSE k.node_id IN $kubernetes END
		AND n.active = true
		`+reporters.ParseFieldFilters2CypherWhereConditions("n", fieldfilters, false)+`
		RETURN n.cloud_provider, n.kubernetes_cluster_id, n.node_id`,
		filterNil(map[string]interface{}{"kubernetes": cloud_kubernetes}))
	if err != nil {
		return res, err
	}

	records, err = r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		//provider := record.Values[0].(string)
		if record.Values[1] == nil || record.Values[2] == nil {
			continue
		}
		parent := NodeID(record.Values[1].(string))
		host_id := NodeID(record.Values[2].(string))
		if _, present := res[parent]; !present {
			res[parent] = []NodeStub{}
		}

		res[parent] = append(res[parent], NodeStub{ID: host_id, Name: string(host_id)})
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getProcesses(
	tx neo4j.Transaction, hosts,
	containers []string) (map[NodeID][]NodeStub, error) {
	res := map[NodeID][]NodeStub{}

	r, err := tx.Run(`
		MATCH (n:Node)
		WHERE n.node_id IN $hosts WITH n
		MATCH (n)-[:HOSTS]->(m:Process)
		RETURN n.node_id, m.node_id, m.node_name`,
		map[string]interface{}{"hosts": hosts})
	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		host_id := NodeID(record.Values[0].(string))
		process_id := NodeID(record.Values[1].(string))
		process_name := record.Values[2].(string)
		if _, present := res[host_id]; !present {
			res[host_id] = []NodeStub{}
		}
		res[host_id] = append(res[host_id], NodeStub{ID: process_id, Name: process_name})
	}

	// Note that this code is overwritting
	// previous parents in `res` and thus needs to be done
	// in that specific order
	r, err = tx.Run(`
		MATCH (n:Container)
		WHERE n.node_id IN $containers WITH n
		MATCH (n)-[:HOSTS]->(m:Process)
		RETURN n.node_id, m.node_id, m.node_name`,
		map[string]interface{}{"containers": containers})
	if err != nil {
		return res, err
	}
	records, err = r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		host_id := NodeID(record.Values[0].(string))
		process_id := NodeID(record.Values[1].(string))
		process_name := record.Values[2].(string)
		if _, present := res[host_id]; !present {
			res[host_id] = []NodeStub{}
		}
		res[host_id] = append(res[host_id], NodeStub{ID: process_id, Name: process_name})
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getPods(
	tx neo4j.Transaction,
	hosts []string,
	fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]NodeStub, error) {
	res := map[NodeID][]NodeStub{}

	r, err := tx.Run(`
		MATCH (n:Pod)
		`+reporters.ParseFieldFilters2CypherWhereConditions("n", fieldfilters, true)+`
		MATCH (m:Node{node_id:n.host_name})
		WHERE CASE WHEN $hosts IS NULL THEN [1] ELSE m.host_name IN $hosts END
		RETURN m.host_name, n.node_id, n.node_name`,
		filterNil(map[string]interface{}{"hosts": hosts}))
	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		host_id := NodeID(record.Values[0].(string))
		pod_id := NodeID(record.Values[1].(string))
		pod_name := record.Values[2].(string)
		if _, present := res[host_id]; !present {
			res[host_id] = []NodeStub{}
		}
		res[host_id] = append(res[host_id], NodeStub{ID: pod_id, Name: pod_name})
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getContainers(
	tx neo4j.Transaction,
	hosts, pods []string,
	fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]NodeStub, error) {
	res := map[NodeID][]NodeStub{}

	r, err := tx.Run(`
		MATCH (n:Node)
		WHERE n.active = true
		AND (CASE WHEN $hosts IS NULL THEN [1] ELSE n.host_name IN $hosts END
		OR CASE WHEN $pods IS NULL THEN [1] ELSE n.pod_name IN $pods END)
		WITH n
		MATCH (n)-[:HOSTS]->(m:Container)
		WHERE m.active = true
		`+reporters.ParseFieldFilters2CypherWhereConditions("m", fieldfilters, true)+`
		RETURN coalesce(n.pod_name, n.node_id), m.node_id, m.docker_container_name`,
		filterNil(map[string]interface{}{"hosts": hosts, "pods": pods}))
	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		parent_id := NodeID(record.Values[0].(string))
		container_id := NodeID(record.Values[1].(string))
		container_name := record.Values[2].(string)
		if _, present := res[parent_id]; !present {
			res[parent_id] = []NodeStub{}
		}
		res[parent_id] = append(res[parent_id], NodeStub{ID: container_id, Name: container_name})
	}

	return res, nil
}

type ConnectionSummary struct {
	Source string `json:"source" required:"true"`
	Target string `json:"target" required:"true"`
}

type RenderedGraph struct {
	Hosts       map[NodeID][]NodeStub `json:"hosts" required:"true"`
	Processes   map[NodeID][]NodeStub `json:"processes" required:"true"`
	Pods        map[NodeID][]NodeStub `json:"pods" required:"true"`
	Containers  map[NodeID][]NodeStub `json:"containers" required:"true"`
	Providers   []NodeStub            `json:"providers" required:"true"`
	Regions     map[NodeID][]NodeStub `json:"regions" required:"true"`
	Kubernetes  map[NodeID][]NodeStub `json:"kubernetes" required:"true"`
	Connections []ConnectionSummary   `json:"connections" required:"true"`
	//PublicCloudResources    map[NodeID][]ResourceStub `json:"public-cloud-resources" required:"true"`
	//NonPublicCloudResources map[NodeID][]ResourceStub `json:"non-public-cloud-resources" required:"true"`
	CloudServices      map[NodeID][]ResourceStub `json:"cloud-services" required:"true"`
	SkippedConnections bool                      `json:"skipped_connections" required:"true"`
}

type TopologyFilters struct {
	CloudFilter      []string                `json:"cloud_filter" required:"true"`
	RegionFilter     []string                `json:"region_filter" required:"true"`
	KubernetesFilter []string                `json:"kubernetes_filter" required:"true"`
	HostFilter       []string                `json:"host_filter" required:"true"`
	PodFilter        []string                `json:"pod_filter" required:"true"`
	ContainerFilter  []string                `json:"container_filter" required:"true"`
	FieldFilter      reporters.FieldsFilters `json:"field_filters" required:"true"`
	SkipConnections  bool                    `json:"skip_connections" required:"true"`
}

type CloudProviderFilter struct {
	AccountIds []string `json:"account_ids" required:"true"`
}

type ThreatFilters struct {
	AwsFilter         CloudProviderFilter `json:"aws_filter" required:"true"`
	GcpFilter         CloudProviderFilter `json:"gcp_filter" required:"true"`
	AzureFilter       CloudProviderFilter `json:"azure_filter" required:"true"`
	IssueType         string              `json:"type" required:"true" enum:"all,vulnerability,secret,malware,compliance,cloud_compliance"`
	CloudResourceOnly bool                `json:"cloud_resource_only" required:"true"`
}

const (
	root_node_id = ""
)

func (nc *neo4jTopologyReporter) getContainerGraph(
	ctx context.Context,
	filters TopologyFilters) (RenderedGraph, error) {
	res := RenderedGraph{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	tmp, err := nc.getContainers(tx, nil, nil, mo.Some(filters.FieldFilter))
	if err != nil {
		return res, err
	}
	// Regroup all hosts into one root host
	res.Containers = map[NodeID][]NodeStub{}
	for _, containers := range tmp {
		res.Containers[root_node_id] = append(res.Containers[root_node_id], containers...)
	}

	res.Processes, err = nc.getProcesses(tx, []string{}, filters.ContainerFilter)
	if err != nil {
		return res, err
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getPodGraph(
	ctx context.Context,
	filters TopologyFilters) (RenderedGraph, error) {
	res := RenderedGraph{}

	pod_filter := filters.PodFilter

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	tmp, err := nc.getPods(tx, nil, mo.Some(filters.FieldFilter))
	if err != nil {
		return res, err
	}
	// Regroup all hosts into one root host
	res.Pods = map[NodeID][]NodeStub{}
	for _, pods := range tmp {
		res.Pods[root_node_id] = append(res.Pods[root_node_id], pods...)
	}
	res.Containers, err = nc.getContainers(tx, []string{}, pod_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getKubernetesGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
	res := RenderedGraph{}

	kubernetes_filter := filters.KubernetesFilter
	host_filter := filters.HostFilter
	pod_filter := filters.PodFilter

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	if !filters.SkipConnections {
		connTx, err := session.BeginTransaction(neo4j.WithTxTimeout(10 * time.Second))
		if err != nil {
			log.Error().Msgf("Topology get transaction: %v", err)
			res.SkippedConnections = true
		} else {
			res.Connections, err = nc.GetKubernetesConnections(connTx, kubernetes_filter, host_filter)
			if err != nil {
				log.Error().Msgf("Topology get connections: %v", err)
				res.SkippedConnections = true
			}
			connTx.Close()
		}
	} else {
		res.SkippedConnections = true
	}

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	tmp, err := nc.getCloudKubernetes(tx, nil, mo.Some(filters.FieldFilter))
	if err != nil {
		return res, err
	}
	// Regroup all providers into one root provider
	res.Kubernetes = map[NodeID][]NodeStub{}
	for _, kubs := range tmp {
		res.Kubernetes[root_node_id] = append(res.Kubernetes[root_node_id], kubs...)
	}
	res.Hosts, err = nc.getHosts(tx, nil, []string{}, kubernetes_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}
	res.Pods, err = nc.getPods(tx, host_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}
	res.Containers, err = nc.getContainers(tx, host_filter, pod_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getHostGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
	res := RenderedGraph{}

	host_filter := filters.HostFilter
	pod_filter := filters.PodFilter

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	if !filters.SkipConnections {
		connTx, err := session.BeginTransaction(neo4j.WithTxTimeout(10 * time.Second))
		if err != nil {
			log.Error().Msgf("Topology get transaction: %v", err)
			res.SkippedConnections = true
		} else {
			res.Connections, err = nc.GetHostConnections(connTx, nil, nil)
			if err != nil {
				log.Error().Msgf("Topology get connections: %v", err)
				res.SkippedConnections = true
			}
			connTx.Close()
		}
	} else {
		res.SkippedConnections = true
	}

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	tmp, err := nc.getHosts(tx, nil, nil, nil, mo.Some(filters.FieldFilter))
	if err != nil {
		return res, err
	}
	// Regroup all regions into one root region
	res.Hosts = map[NodeID][]NodeStub{}
	for _, hosts := range tmp {
		res.Hosts[root_node_id] = append(res.Hosts[root_node_id], hosts...)
	}
	res.Processes, err = nc.getProcesses(tx, host_filter, []string{})
	if err != nil {
		return res, err
	}
	res.Pods, err = nc.getPods(tx, host_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}
	res.Containers, err = nc.getContainers(tx, host_filter, pod_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
	res := RenderedGraph{}

	cloud_filter := filters.CloudFilter
	region_filter := filters.RegionFilter
	kubernetes_filter := filters.KubernetesFilter
	host_filter := filters.HostFilter
	pod_filter := filters.PodFilter
	container_filter := filters.ContainerFilter

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	if !filters.SkipConnections {
		connTx, err := session.BeginTransaction(neo4j.WithTxTimeout(10 * time.Second))
		if err != nil {
			return res, err
		}
		res.Connections, err = nc.GetConnections(connTx, cloud_filter, region_filter, kubernetes_filter, host_filter)
		if err != nil {
			log.Error().Msgf("Topology get connections: %v", err)
			res.SkippedConnections = true
		}
		connTx.Close()
	} else {
		res.SkippedConnections = true
	}

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	res.Providers, err = nc.getCloudProviders(tx)
	if err != nil {
		return res, err
	}
	res.Regions, err = nc.getCloudRegions(tx, cloud_filter)
	if err != nil {
		return res, err
	}
	res.Kubernetes, err = nc.getCloudKubernetes(tx, cloud_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}
	res.Hosts, err = nc.getHosts(tx, cloud_filter, region_filter, kubernetes_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}
	res.Processes, err = nc.getProcesses(tx, host_filter, container_filter)
	if err != nil {
		return res, err
	}
	res.Pods, err = nc.getPods(tx, host_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}
	res.Containers, err = nc.getContainers(tx, host_filter, pod_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}
	res.CloudServices, err = nc.GetCloudServices(tx, cloud_filter, region_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) Graph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
	return nc.getGraph(ctx, filters)
}

func (nc *neo4jTopologyReporter) HostGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
	return nc.getHostGraph(ctx, filters)
}

func (nc *neo4jTopologyReporter) PodGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
	return nc.getPodGraph(ctx, filters)
}

func (nc *neo4jTopologyReporter) ContainerGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
	return nc.getContainerGraph(ctx, filters)
}

func (nc *neo4jTopologyReporter) KubernetesGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
	return nc.getKubernetesGraph(ctx, filters)
}

func NewNeo4jCollector(ctx context.Context) (TopologyReporter, error) {
	nc := &neo4jTopologyReporter{}

	return nc, nil
}

func GetTopologyDelta(ctx context.Context,
	deltaReq model.TopologyDeltaReq) (model.TopologyDeltaResponse, error) {

	deltaResp := model.TopologyDeltaResponse{}
	deltaResp.Additions = make([]model.NodeIdentifier, 0)
	deltaResp.Deletions = make([]model.NodeIdentifier, 0)

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return deltaResp, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return deltaResp, err
	}
	defer tx.Close()

	processRecords := func(isAdd bool, query string, timestamp int64) error {
		r, err := tx.Run(query, map[string]interface{}{})
		if err != nil {
			return err
		}

		records, err := r.Collect()
		if err != nil {
			return err
		}

		maxTime := int64(0)
		for _, record := range records {
			nodeid := record.Values[0].(string)
			nodeType := record.Values[1].(string)
			if isAdd {
				deltaResp.Additions = append(deltaResp.Additions,
					model.NodeIdentifier{NodeId: nodeid, NodeType: nodeType})
			} else {
				deltaResp.Deletions = append(deltaResp.Deletions,
					model.NodeIdentifier{NodeId: nodeid, NodeType: nodeType})
			}
			ts := record.Values[2].(int64)
			if ts > maxTime {
				maxTime = ts
			}
		}

		if maxTime == 0 {
			//Set it to previous timestamp
			maxTime = timestamp
		}

		if isAdd {
			deltaResp.AdditionTimestamp = maxTime
		} else {
			deltaResp.DeletionTimestamp = maxTime
		}

		return nil
	}

	nodeTypeQueryStr := "("
	for idx, entity := range deltaReq.EntityTypes {
		nodeTypeQueryStr = nodeTypeQueryStr + "n:" + entity
		if idx < (len(deltaReq.EntityTypes) - 1) {
			nodeTypeQueryStr = nodeTypeQueryStr + " OR "
		} else {
			nodeTypeQueryStr = nodeTypeQueryStr + ")"
		}
	}

	if deltaReq.Addition {
		additionQuery := `MATCH (n) WHERE ` + nodeTypeQueryStr + `
		AND n.active=true AND n.created_at > %d 
		RETURN n.node_id, n.node_type, n.created_at`

		err = processRecords(true, fmt.Sprintf(additionQuery,
			deltaReq.AdditionTimestamp), deltaReq.AdditionTimestamp)
		if err != nil {
			return deltaResp, err
		}
	}

	if deltaReq.Deletion {
		deletionQuery := `MATCH (n) WHERE ` + nodeTypeQueryStr + `
        AND n.active=false AND n.updated_at > %d
        RETURN n.node_id, n.node_type, n.updated_at`

		err = processRecords(false, fmt.Sprintf(deletionQuery,
			deltaReq.DeletionTimestamp), deltaReq.DeletionTimestamp)
		if err != nil {
			return deltaResp, err
		}
	}

	return deltaResp, nil
}

func (ntp *neo4jTopologyReporter) Close() {
}
