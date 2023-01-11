package reporters

import (
	"context"
	"fmt"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/dbtype"
)

type ThreatGraphReporter struct {
	driver neo4j.Driver
}

func NewThreatGraphReporter(ctx context.Context) (*ThreatGraphReporter, error) {
	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return nil, err
	}

	nc := &ThreatGraphReporter{
		driver: driver,
	}

	return nc, nil
}

func (tc *ThreatGraphReporter) ComputeThreatGraph() error {
	session, err := tc.driver.Session(neo4j.AccessModeWrite)

	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run("MATCH (s:CveScan) -[:SCANNED]-> (m) WITH max(s.time_stamp) as most_recent, m MATCH (s:CveScan {time_stamp: most_recent})-[:DETECTED]->(c:Cve) WITH m, count(distinct c) as num_cve SET m.num_cve = num_cve", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (s:SecretScan) -[:SCANNED]-> (m) WITH max(s.time_stamp) as most_recent, m MATCH (s:SecretScan {time_stamp: most_recent})-[:DETECTED]->(c:Secret) WITH m, count(distinct c) as num_secrets SET m.num_secrets = num_secrets", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (s:ComplianceScan) -[:SCANNED]-> (m) WITH max(s.time_stamp) as most_recent, m MATCH (s:ComplianceScan {time_stamp: most_recent})-[:DETECTED]->(c:Compliance) WITH m, count(distinct c) as num_compliance SET m.num_compliance = num_compliance", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Node) SET n.sum_cve = COALESCE(n.num_cve, 0), n.sum_secrets = COALESCE(n.num_secrets, 0), n.sum_compliance = COALESCE(n.num_compliance, 0);", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Node) -[:CONNECTED]->(m:Node) SET n.sum_cve = COALESCE(n.sum_cve, 0) + COALESCE(m.sum_cve, m.num_cve, 0), n.sum_secrets = COALESCE(n.sum_secrets, 0) + COALESCE(m.sum_secrets, m.num_secrets, 0), n.sum_compliance = COALESCE(n.sum_compliance, 0) + COALESCE(m.sum_compliance, m.num_compliance, 0);", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Node {node_id:'in-the-internet'})-[d:CONNECTS*]->(m:Node) with SIZE(d) as depth, m with min(depth) as min_depth, m SET m.depth = min_depth", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Node) SET n.num_cve = COALESCE(n.num_cve, 0), n.num_secrets = COALESCE(n.num_secrets, 0), n.num_compliance = COALESCE(n.num_compliance, 0);", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Node) SET n.sum_cve = n.num_cve, n.sum_secrets = n.num_secrets, n.sum_compliance = n.num_compliance;", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Node) -[:CONNECTS]->(m:Node) SET n.sum_cve = COALESCE(n.sum_cve, 0) + COALESCE(m.sum_cve, m.num_cve, 0), n.sum_secrets = COALESCE(n.sum_secrets, 0) + COALESCE(m.sum_secrets, m.num_secrets, 0), n.sum_compliance = COALESCE(n.sum_compliance, 0) + COALESCE(m.sum_compliance, m.num_compliance, 0);", map[string]interface{}{}); err != nil {
		return err
	}

	return tx.Commit()
}

const (
	CLOUD_AWS     = "aws"
	CLOUD_AZURE   = "azure"
	CLOUD_GCP     = "gcp"
	CLOUD_PRIVATE = "others"
)

var CLOUD_ALL = [...]string{CLOUD_AWS, CLOUD_AZURE, CLOUD_GCP, CLOUD_PRIVATE}

func (tc *ThreatGraphReporter) GetThreatGraph() (ThreatGraph, error) {
	aggreg, err := tc.GetRawThreatGraph()
	if err != nil {
		return ThreatGraph{}, err
	}

	all := ThreatGraph{}
	for _, cp := range CLOUD_ALL {
		resources := []ThreatNodeInfo{}
		node_info := aggreg[cp].getNodeInfos()
		depths := aggreg[cp].nodes_depth
		if _, has := depths[1]; !has {
			goto end
		}
		for _, root := range depths[1] {
			visited := map[int64]struct{}{}
			attack_paths := build_attack_paths(aggreg[cp], root, visited)
			paths := [][]string{}
			for _, Attack_path := range attack_paths {
				path := []string{}
				for i := range Attack_path {
					index := int64(len(Attack_path)-1) - int64(i)
					path = append(path, node_info[index].Id)
				}
				paths = append(paths, append([]string{"The Internet"}, path...))
				entry := ThreatNodeInfo{
					Label:               node_info[int64(len(Attack_path)-1)].Label,
					Id:                  node_info[int64(len(Attack_path)-1)].Id,
					Nodes:               node_info[int64(len(Attack_path)-1)].Nodes,
					Vulnerability_count: node_info[int64(len(Attack_path)-1)].Vulnerability_count,
					Secrets_count:       node_info[int64(len(Attack_path)-1)].Secrets_count,
					Compliance_count:    node_info[int64(len(Attack_path)-1)].Compliance_count,
					Count:               node_info[int64(len(Attack_path)-1)].Count,
					Node_type:           node_info[int64(len(Attack_path)-1)].Node_type,
					Attack_path:         paths,
				}
				resources = append(resources, entry)
			}
		}
	end:
		all[cp] = ProviderThreatGraph{
			Resources:           resources,
			Compliance_count:    0,
			Secrets_count:       0,
			Vulnerability_count: 0,
		}
	}

	return all, nil
}

func build_attack_paths(paths AttackPaths, root int64, visited map[int64]struct{}) [][]int64 {
	if _, has := visited[root]; has {
		return [][]int64{}
	}
	visited[root] = struct{}{}
	if _, has := paths.nodes_data[root]; !has {
		return [][]int64{}
	}
	if _, has := paths.nodes_tree[root]; !has {
		return [][]int64{{root}}
	}
	res := [][]int64{{}}
	for _, edge := range paths.nodes_tree[root] {
		edge_paths := build_attack_paths(paths, edge, visited)
		for _, edge_path := range edge_paths {
			res = append(res, append([]int64{root}, edge_path...))
		}
	}
	if len(res) == 0 {
		return [][]int64{{root}}
	}
	return res
}

func (tc *ThreatGraphReporter) GetRawThreatGraph() (map[string]AttackPaths, error) {
	session, err := tc.driver.Session(neo4j.AccessModeRead)

	if err != nil {
		return nil, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return nil, err
	}
	defer tx.Close()

	all := map[string]AttackPaths{}
	for _, cloud_provider := range CLOUD_ALL {
		var res neo4j.Result
		if cloud_provider != CLOUD_PRIVATE {
			if res, err = tx.Run(`
				CALL apoc.nodes.group(['Node'], ['node_type', 'depth',
				'cloud_provider'], [{`+"`*`"+`: 'count', sum_cve: 'sum', sum_secrets: 'sum', sum_compliance: 'sum',
				node_id:'collect', num_cve: 'collect', num_secrets:'collect', num_compliance:'collect'},{`+"`*`"+`: 'count'}], {selfRels: false})
				YIELD node, relationships
				WHERE apoc.any.property(node, 'depth') IS NOT NULL
				AND apoc.any.property(node, 'cloud_provider') = '`+cloud_provider+`'
				RETURN node, relationships
				`, map[string]interface{}{}); err != nil {
			}
		} else {
			if res, err = tx.Run(`
				CALL apoc.nodes.group(['Node'], ['node_type', 'depth',
				'cloud_provider'], [{`+"`*`"+`: 'count', sum_cve: 'sum', sum_secrets: 'sum', sum_compliance: 'sum',
				node_id:'collect', num_cve: 'collect', num_secrets:'collect', num_compliance:'collect'},{`+"`*`"+`: 'count'}], {selfRels: false})
				YIELD node, relationships
				WHERE apoc.any.property(node, 'depth') IS NOT NULL
				AND NOT apoc.any.property(node, 'cloud_provider') IN ['aws', 'gcp', 'azure']
				AND apoc.any.property(node, 'cloud_provider') <> 'internet'
				RETURN node, relationships
				`, map[string]interface{}{}); err != nil {
			}
		}

		if err != nil {
			return nil, err
		}

		records, err := res.Collect()
		if err != nil {
			return nil, err
		}

		nodes_tree := map[int64][]int64{}
		nodes_data := map[int64]AttackPathData{}
		nodes_depth := map[int64][]int64{}
		for _, record := range records {
			record_node, _ := record.Get("node")
			record_relationships, _ := record.Get("relationships")
			node := record_node.(dbtype.Node)
			node_datum := record2struct(node)
			nodes_data[node.Id] = node_datum

			for _, rel_node := range record_relationships.([]interface{}) {
				rel := rel_node.(dbtype.Relationship)
				nodes_tree[node.Id] = append(nodes_tree[node.Id], rel.EndId)

			}
			nodes_depth[node_datum.depth] = append(nodes_depth[node_datum.depth], node.Id)
		}

		all[cloud_provider] = AttackPaths{
			nodes_tree:  nodes_tree,
			nodes_data:  nodes_data,
			nodes_depth: nodes_depth,
		}
	}

	return all, nil
}

type AttackPaths struct {
	nodes_tree  map[int64][]int64
	nodes_data  map[int64]AttackPathData
	nodes_depth map[int64][]int64
}

func record2struct(node dbtype.Node) AttackPathData {

	record := node.Props
	Node_type, _ := record["node_type"]
	depth, _ := record["depth"]
	cloud_provider, _ := record["cloud_provider"]
	sum_sum_cve, _ := record["sum_sum_cve"]
	sum_sum_secrets, _ := record["sum_sum_secrets"]
	sum_sum_compliance, _ := record["sum_sum_compliance"]
	node_count, _ := record["count_*"]
	collect_node_id_, _ := record["collect_node_id"]
	collect_num_cve_, _ := record["collect_num_cve"]
	collect_num_secrets_, _ := record["collect_num_secrets"]
	collect_num_compliance_, _ := record["collect_num_compliance"]

	collect_node_id := []string{}
	for _, v := range collect_node_id_.([]interface{}) {
		collect_node_id = append(collect_node_id, v.(string))
	}

	collect_num_cve := []int64{}
	for _, v := range collect_num_cve_.([]interface{}) {
		collect_num_cve = append(collect_num_cve, v.(int64))
	}

	collect_num_secrets := []int64{}
	for _, v := range collect_num_secrets_.([]interface{}) {
		collect_num_secrets = append(collect_num_secrets, v.(int64))
	}

	collect_num_compliance := []int64{}
	for _, v := range collect_num_compliance_.([]interface{}) {
		collect_num_compliance = append(collect_num_compliance, v.(int64))
	}

	return AttackPathData{
		Node_type:              Node_type.(string),
		cloud_provider:         cloud_provider.(string),
		depth:                  depth.(int64),
		sum_sum_cve:            sum_sum_cve.(int64),
		sum_sum_secrets:        sum_sum_secrets.(int64),
		sum_sum_compliance:     sum_sum_compliance.(int64),
		node_count:             node_count.(int64),
		collect_node_id:        collect_node_id,
		collect_num_cve:        collect_num_cve,
		collect_num_secrets:    collect_num_secrets,
		collect_num_compliance: collect_num_compliance,
	}
}

type AttackPathData struct {
	identity               int64
	Node_type              string
	cloud_provider         string
	depth                  int64
	sum_sum_cve            int64
	sum_sum_secrets        int64
	sum_sum_compliance     int64
	node_count             int64
	collect_node_id        []string
	collect_num_cve        []int64
	collect_num_secrets    []int64
	collect_num_compliance []int64
}

var container_id = 0
var host_id = 0

func (ap AttackPaths) getNodeInfos() map[int64]ThreatNodeInfo {
	res := map[int64]ThreatNodeInfo{}
	for _, v := range ap.nodes_data {
		var Label, Id string
		switch v.Node_type {
		case "host":
			Label = "Compute Instance"
			Id = fmt.Sprintf("%v-host-%v", v.cloud_provider, host_id)
			host_id += 1
		case "container":
			Label = "Container"
			Id = fmt.Sprintf("%v-container-%v", v.cloud_provider, container_id)
			container_id += 1
		default:
			Label = "The Internet"
			Id = "The Internet"
		}
		Nodes := map[string]NodeInfo{}
		for i, Node_id := range v.collect_node_id {
			Nodes[Node_id] = NodeInfo{
				Node_id:               v.collect_node_id[i],
				Image_name:            "",
				Name:                  Node_id,
				Vulnerability_count:   v.collect_num_cve[i],
				Vulnerability_scan_id: "",
				Secrets_count:         v.collect_num_secrets[i],
				Secrets_scan_id:       "",
				Compliance_count:      v.collect_num_compliance[i],
				Compliance_scan_id:    "",
			}
		}
		res[v.identity] = ThreatNodeInfo{
			Label:               Label,
			Id:                  Id,
			Nodes:               Nodes,
			Vulnerability_count: v.sum_sum_cve,
			Secrets_count:       v.sum_sum_secrets,
			Compliance_count:    v.sum_sum_compliance,
			Count:               int64(len(v.collect_node_id)),
			Node_type:           v.Node_type,
			Attack_path:         [][]string{},
		}
	}
	return res
}

type ThreatGraph map[string]ProviderThreatGraph

type ProviderThreatGraph struct {
	Resources           []ThreatNodeInfo `json:"resources" required:"true"`
	Compliance_count    int64            `json:"compliance_count" required:"true"`
	Secrets_count       int64            `json:"secrets_count" required:"true"`
	Vulnerability_count int64            `json:"vulnerability_count" required:"true"`
}

type ThreatNodeInfo struct {
	Label string              `json:"label" required:"true"`
	Id    string              `json:"id" required:"true"`
	Nodes map[string]NodeInfo `json:"nodes" required:"true"`

	Vulnerability_count int64 `json:"vulnerability_count" required:"true"`
	Secrets_count       int64 `json:"secrets_count" required:"true"`
	Compliance_count    int64 `json:"compliance_count" required:"true"`
	Count               int64 `json:"count" required:"true"`

	Node_type string `json:"node_type" required:"true"`

	Attack_path [][]string `json:"attack_path" required:"true"`
}

type NodeInfo struct {
	Node_id               string `json:"node_id" required:"true"`
	Image_name            string `json:"image_name" required:"true"`
	Name                  string `json:"name" required:"true"`
	Vulnerability_count   int64  `json:"vulnerability_count" required:"true"`
	Vulnerability_scan_id string `json:"vulnerability_scan_id" required:"true"`
	Secrets_count         int64  `json:"secrets_count" required:"true"`
	Secrets_scan_id       string `json:"secrets_scan_id" required:"true"`
	Compliance_count      int64  `json:"compliance_count" required:"true"`
	Compliance_scan_id    string `json:"compliance_scan_id" required:"true"`
}
