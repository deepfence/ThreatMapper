package reporters_graph

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"reflect"
	"sort"

	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/samber/mo"
)

type TopologyReporter interface {
	Graph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	HostGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	KubernetesGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	ContainerGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	PodGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
}

type neo4jTopologyReporter struct {
	driver neo4j.Driver
}

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

func (nc *neo4jTopologyReporter) GetConnections(tx neo4j.Transaction) ([]ConnectionSummary, error) {

	r, err := tx.Run(`
	MATCH (n:Node) -[r:CONNECTS]-> (m:Node)
	WHERE n.active = true
	WITH CASE WHEN coalesce(n.kubernetes_cluster_id, '') <> '' THEN n.kubernetes_cluster_id ELSE n.cloud_region END AS left_region, n, m, r, CASE WHEN coalesce(m.kubernetes_cluster_id, '') <> '' THEN m.kubernetes_cluster_id ELSE m.cloud_region END AS right_region
	RETURN n.cloud_provider, left_region, n.node_id, r.left_pid, m.cloud_provider, right_region, m.node_id, r.right_pid`, nil)

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

func (nc *neo4jTopologyReporter) GetNonPublicCloudResources(tx neo4j.Transaction, cloud_provider []string, cloud_regions []string, cloud_services []string, fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]ResourceStub, error) {
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

var (
	topology_cloud_resource_types = []string{
		"aws_ec2_instance", "aws_eks_cluster", "aws_s3_bucket", "aws_lambda_function",
		"aws_ecs_task", "aws_ecs_cluster", "aws_ecr_repository", "aws_ecrpublic_repository",
		"aws_ecs_task", "aws_rds_db_instance", "aws_rds_db_cluster", "aws_ec2_application_load_balancer",
		"aws_ec2_classic_load_balancer", "aws_ec2_network_load_balancer"}
)

func (nc *neo4jTopologyReporter) GetCloudServices(
	tx neo4j.Transaction,
	cloud_provider []string,
	cloud_regions []string,
	fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]ResourceStub, error) {

	res := map[NodeID][]ResourceStub{}
	r, err := tx.Run(`
		MATCH (s:CloudResource)
		WHERE s.node_type IN $resource_types
		AND CASE WHEN $providers IS NULL THEN [1] ELSE s.cloud_provider IN $providers END
		AND CASE WHEN $regions IS NULL THEN [1] ELSE s.region IN $regions END `+
		reporters.ParseFieldFilters2CypherWhereConditions("s", fieldfilters, false)+`
		RETURN collect(s.node_id), s.region, s.node_type`,
		filterNil(map[string]interface{}{
			"providers":      cloud_provider,
			"regions":        cloud_regions,
			"resource_types": topology_cloud_resource_types,
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

func (nc *neo4jTopologyReporter) GetPublicCloudResources(tx neo4j.Transaction, cloud_provider []string, cloud_regions []string, cloud_services []string, fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]ResourceStub, error) {
	res := map[NodeID][]ResourceStub{}
	r, err := tx.Run(`
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
		MATCH (n:Node)
		WHERE n.active = true
		AND n.cloud_provider <> 'internet'
		RETURN n.cloud_provider`, nil)

	if err != nil {
		return res, err
	}
	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		res = append(res, NodeStub{NodeID(record.Values[0].(string)), record.Values[0].(string)})
	}

	r, err = tx.Run(`
		MATCH (n:CloudResource)
		WHERE n.node_type IN $resource_types
		RETURN n.cloud_provider`,
		filterNil(map[string]interface{}{
			"resource_types": topology_cloud_resource_types,
		}))

	if err != nil {
		return res, err
	}
	records, err = r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		res = append(res, NodeStub{NodeID(record.Values[0].(string)), record.Values[0].(string)})
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getCloudRegions(tx neo4j.Transaction, cloud_provider []string) (map[NodeID][]NodeStub, error) {
	res := map[NodeID][]NodeStub{}
	r, err := tx.Run(`
		MATCH (n:Node)
		WHERE n.active = true
		AND n.kubernetes_cluster_id = ""
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
		provider := NodeID(record.Values[0].(string))
		region := NodeID(record.Values[1].(string))
		if _, present := res[provider]; !present {
			res[provider] = []NodeStub{}
		}
		res[provider] = append(res[provider], NodeStub{ID: region, Name: string(region)})
	}

	r, err = tx.Run(`
		MATCH (n:CloudResource)
		WHERE CASE WHEN $providers IS NULL THEN [1] ELSE n.cloud_provider IN $providers END
		AND n.node_type IN $resource_types
		RETURN n.cloud_provider, n.region`,
		filterNil(map[string]interface{}{
			"providers":      cloud_provider,
			"resource_types": topology_cloud_resource_types,
		}))

	if err != nil {
		return res, err
	}
	records, err = r.Collect()

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

func (nc *neo4jTopologyReporter) getCloudKubernetes(tx neo4j.Transaction, cloud_provider []string, fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]NodeStub, error) {
	res := map[NodeID][]NodeStub{}
	r, err := tx.Run(`
		MATCH (n:KubernetesCluster) -[:INSTANCIATE]-> (m:Node)
		WHERE n.active = true
		WITH DISTINCT m.cloud_provider as cloud_provider, n
		WHERE CASE WHEN $providers IS NULL THEN [1] ELSE cloud_provider IN $providers END
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

func (nc *neo4jTopologyReporter) getHosts(tx neo4j.Transaction, cloud_provider, cloud_regions, cloud_kubernetes []string, fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]NodeStub, error) {
	res := map[NodeID][]NodeStub{}

	r, err := tx.Run(`
		MATCH (n:Node)
		WITH coalesce(n.kubernetes_cluster_id, '') <> '' AS is_kub, n
		WHERE n.active = true
		AND CASE WHEN $providers IS NULL THEN [1] ELSE n.cloud_provider IN $providers END
		AND CASE WHEN is_kub THEN
		    CASE WHEN $kubernetes IS NULL THEN [1] ELSE n.kubernetes_cluster_id IN $kubernetes END
		ELSE
		    CASE WHEN $regions IS NULL THEN [1] ELSE n.cloud_region IN $regions END
		END
		`+reporters.ParseFieldFilters2CypherWhereConditions("n", fieldfilters, false)+`
		RETURN n.cloud_provider, CASE WHEN is_kub THEN n.kubernetes_cluster_id ELSE n.cloud_region END, n.node_id`,
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
		if record.Values[1] == nil || record.Values[2] == nil {
			continue
		}
		region := NodeID(record.Values[1].(string))
		host_id := NodeID(record.Values[2].(string))
		if _, present := res[region]; !present {
			res[region] = []NodeStub{}
		}

		res[region] = append(res[region], NodeStub{ID: host_id, Name: string(host_id)})
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getProcesses(tx neo4j.Transaction, hosts []string) (map[NodeID][]NodeStub, error) {
	res := map[NodeID][]NodeStub{}

	r, err := tx.Run(`
		MATCH (n:Node)
		WHERE n.host_name IN $hosts WITH n
		MATCH (n)-[:HOSTS]->(m:Process)
		RETURN n.node_id, m.node_id, m.name`,
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

	return res, nil
}

func (nc *neo4jTopologyReporter) getPods(tx neo4j.Transaction, hosts []string, fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]NodeStub, error) {
	res := map[NodeID][]NodeStub{}

	r, err := tx.Run(`
		MATCH (n:Pod)
		`+reporters.ParseFieldFilters2CypherWhereConditions("n", fieldfilters, true)+`
		MATCH (m:Node{node_id:n.host_node_id})
		WHERE CASE WHEN $hosts IS NULL THEN [1] ELSE m.host_name IN $hosts END
		RETURN m.host_name, n.node_id, n.kubernetes_name`,
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

func (nc *neo4jTopologyReporter) getContainers(tx neo4j.Transaction, hosts, pods []string, fieldfilters mo.Option[reporters.FieldsFilters]) (map[NodeID][]NodeStub, error) {
	res := map[NodeID][]NodeStub{}

	r, err := tx.Run(`
		MATCH (n:Node)
		WHERE n.active = true
		AND (CASE WHEN $hosts IS NULL THEN [1] ELSE n.host_name IN $hosts END
		OR CASE WHEN $pods IS NULL THEN [1] ELSE n.`+"`docker_label_io.kubernetes.pod.name`"+`IN $pods END)
		WITH n
		MATCH (n)-[:HOSTS]->(m:Container)
		`+reporters.ParseFieldFilters2CypherWhereConditions("m", fieldfilters, true)+`
		RETURN coalesce(n.`+"`docker_label_io.kubernetes.pod.name`"+`, n.node_id), m.node_id, m.docker_container_name`,
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
	CloudServices map[NodeID][]ResourceStub `json:"cloud-services" required:"true"`
}

type TopologyFilters struct {
	CloudFilter      []string                `json:"cloud_filter" required:"true"`
	RegionFilter     []string                `json:"region_filter" required:"true"`
	KubernetesFilter []string                `json:"kubernetes_filter" required:"true"`
	HostFilter       []string                `json:"host_filter" required:"true"`
	PodFilter        []string                `json:"pod_filter" required:"true"`
	FieldFilter      reporters.FieldsFilters `json:"field_filters" required:"true"`
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

func (nc *neo4jTopologyReporter) getContainerGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
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

	res.Containers, err = nc.getContainers(tx, nil, nil, mo.Some(filters.FieldFilter))
	if err != nil {
		return res, err
	}

	return res, nil
}

func (nc *neo4jTopologyReporter) getPodGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error) {
	res := RenderedGraph{}

	pod_filter := filters.PodFilter

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
	res.Pods, err = nc.getPods(tx, nil, mo.Some(filters.FieldFilter))
	if err != nil {
		return res, err
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
	res.Kubernetes, err = nc.getCloudKubernetes(tx, nil, mo.Some(filters.FieldFilter))
	if err != nil {
		return res, err
	}
	res.Hosts, err = nc.getHosts(tx, []string{}, []string{}, kubernetes_filter, mo.None[reporters.FieldsFilters]())
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
	res.Hosts, err = nc.getHosts(tx, nil, nil, nil, mo.Some(filters.FieldFilter))
	if err != nil {
		return res, err
	}
	res.Processes, err = nc.getProcesses(tx, host_filter)
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
	res.Kubernetes, err = nc.getCloudKubernetes(tx, cloud_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}
	res.Hosts, err = nc.getHosts(tx, cloud_filter, region_filter, kubernetes_filter, mo.None[reporters.FieldsFilters]())
	if err != nil {
		return res, err
	}
	res.Processes, err = nc.getProcesses(tx, host_filter)
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
	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return nil, err
	}

	nc := &neo4jTopologyReporter{
		driver: driver,
	}

	return nc, nil
}
