package reporters_graph

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"sort"
	"time"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
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

const (
	CLOUD_AWS     = "aws"
	CLOUD_AZURE   = "azure"
	CLOUD_GCP     = "gcp"
	CLOUD_PRIVATE = "others"
)

var CLOUD_ALL = [...]string{CLOUD_AWS, CLOUD_AZURE, CLOUD_GCP, CLOUD_PRIVATE}

func (tc *ThreatGraphReporter) GetThreatGraph(filter ThreatFilters) (ThreatGraph, error) {
	aggreg, err := tc.GetRawThreatGraph(filter)
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
			attackPaths := build_attack_paths(aggreg[cp], root, visited)
			paths := [][]string{}

			for _, attackPath := range attackPaths {
				path := []string{}
				for i := range attackPath {
					index := attackPath[int64(len(attackPath)-1)-int64(i)]
					path = append(path, node_info[index].Id)
				}
				paths = append(paths, append([]string{"The Internet"}, path...))
				index := attackPath[len(attackPath)-1]
				entry := ThreatNodeInfo{
					Label:                 node_info[index].Label,
					Id:                    node_info[index].Id,
					Nodes:                 node_info[index].Nodes,
					Vulnerability_count:   node_info[index].Vulnerability_count,
					Secrets_count:         node_info[index].Secrets_count,
					Compliance_count:      node_info[index].Compliance_count,
					CloudCompliance_count: node_info[index].CloudCompliance_count,
					Count:                 node_info[index].Count,
					Node_type:             node_info[index].Node_type,
					Attack_path:           paths,
				}
				resources = append(resources, entry)
			}
		}
	end:
		all[cp] = ProviderThreatGraph{
			Resources:             resources,
			Compliance_count:      0,
			Secrets_count:         0,
			Vulnerability_count:   0,
			CloudCompliance_count: 0,
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
	res := [][]int64{}
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

func (tc *ThreatGraphReporter) GetRawThreatGraph(filters ThreatFilters) (map[string]AttackPaths, error) {
	session, err := tc.driver.Session(neo4j.AccessModeWrite)

	if err != nil {
		return nil, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(120 * time.Second))
	if err != nil {
		return nil, err
	}
	defer tx.Close()

	_, err = tx.Run(`
		MATCH (n:ThreatCloudResource)
		REMOVE n:ThreatCloudResource
	`, map[string]interface{}{})
	if err != nil {
		return nil, err
	}

	_, err = tx.Run(`
		MATCH (n:ThreatNode)
		REMOVE n:ThreatNode
	`, map[string]interface{}{})
	if err != nil {
		return nil, err
	}

	_, err = tx.Run(`
		MATCH (n:CloudResource)
		WHERE n.depth IS NOT NULL
		AND (
			CASE WHEN $type = 'vulnerability' or $type = 'all' THEN n.vulnerabilities_count > 0 ELSE false END
			OR
			CASE WHEN $type = 'secret' or $type = 'all' THEN n.secrets_count > 0 ELSE false END
			OR
			CASE WHEN $type = 'malware' or $type = 'all' THEN n.malwares_count > 0 ELSE false END
			OR
			CASE WHEN $type = 'compliance' or $type = 'all' THEN n.compliances_count > 0 ELSE false END
			OR
			CASE WHEN $type = 'cloud_compliance' or $type = 'all' THEN n.cloud_compliances_count > 0 ELSE false END
		)
		WITH n, n.cloud_provider as provider
		WHERE CASE WHEN size($aws_ids) = 0 OR provider <> 'aws' THEN true ELSE n.account_id IN $aws_ids END
		AND CASE WHEN size($gcp_ids) = 0 OR provider <> 'gcp' THEN true ELSE n.account_id IN $gcp_ids END
		AND CASE WHEN size($azure_ids) = 0 OR provider <> 'azure' THEN true ELSE n.account_id IN $azure_ids END
		SET n:ThreatCloudResource`,
		map[string]interface{}{
			"aws_ids":   filters.AwsFilter.AccountIds,
			"gcp_ids":   filters.GcpFilter.AccountIds,
			"azure_ids": filters.AzureFilter.AccountIds,
			"type":      filters.IssueType,
		},
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Run(`
		MATCH (n:Node)
		WHERE n.depth IS NOT NULL
		AND (
			CASE WHEN $type = 'vulnerability' or $type = 'all' THEN n.vulnerabilities_count > 0 ELSE false END
			OR
			CASE WHEN $type = 'secret' or $type = 'all' THEN n.secrets_count > 0 ELSE false END
			OR
			CASE WHEN $type = 'malware' or $type = 'all' THEN n.malwares_count > 0 ELSE false END
			OR
			CASE WHEN $type = 'compliance' or $type = 'all' THEN n.compliances_count > 0 ELSE false END
			OR
			CASE WHEN $type = 'cloud_compliance' or $type = 'all' THEN n.cloud_compliances_count > 0 ELSE false END
		)
		SET n:ThreatNode
	`, map[string]interface{}{
		"type": filters.IssueType,
	},
	)
	if err != nil {
		return nil, err
	}

	awsAccountIdsFilterSet := len(filters.AwsFilter.AccountIds) > 0
	gcpAccountIdsFilterSet := len(filters.GcpFilter.AccountIds) > 0
	azureAccountIdsFilterSet := len(filters.AzureFilter.AccountIds) > 0
	cloudAccountIdsFilterSet := awsAccountIdsFilterSet || gcpAccountIdsFilterSet || azureAccountIdsFilterSet

	all := map[string]AttackPaths{}
	for _, cloudProvider := range CLOUD_ALL {
		if cloudAccountIdsFilterSet {
			switch cloudProvider {
			case CLOUD_AWS:
				if awsAccountIdsFilterSet == false {
					continue
				}
			case CLOUD_GCP:
				if gcpAccountIdsFilterSet == false {
					continue
				}
			case CLOUD_AZURE:
				if azureAccountIdsFilterSet == false {
					continue
				}
			case CLOUD_PRIVATE:
				continue
			}
		}
		var res neo4j.Result
		if cloudProvider != CLOUD_PRIVATE {
			if res, err = tx.Run(`
				CALL apoc.nodes.group(['ThreatCloudResource','ThreatNode'], ['node_type', 'depth', 'cloud_provider'],
				[{`+"`*`"+`: 'count', sum_cve: 'sum', sum_secrets: 'sum', sum_compliance: 'sum', sum_cloud_compliance: 'sum',
				node_id:'collect', vulnerabilities_count: 'collect', secrets_count:'collect', compliances_count:'collect', cloud_compliances_count: 'collect'},
				{`+"`*`"+`: 'count'}], {selfRels: false})
				YIELD node, relationships
				WHERE apoc.any.property(node, 'cloud_provider') = '`+cloudProvider+`'
				RETURN node, relationships
				`, map[string]interface{}{}); err != nil {
			}
		} else if !filters.CloudResourceOnly {
			if res, err = tx.Run(`
				CALL apoc.nodes.group(['ThreatNode'], ['node_type', 'depth', 'cloud_provider'],
				[{`+"`*`"+`: 'count', sum_cve: 'sum', sum_secrets: 'sum', sum_compliance: 'sum', sum_cloud_compliance: 'sum',
				node_id:'collect', vulnerabilities_count: 'collect', secrets_count:'collect', compliances_count:'collect', cloud_compliances_count:'collect'},
				{`+"`*`"+`: 'count'}], {selfRels: false})
				YIELD node, relationships
				WHERE NOT apoc.any.property(node, 'cloud_provider') IN ['aws', 'gcp', 'azure']
				AND apoc.any.property(node, 'cloud_provider') <> 'internet'
				RETURN node, relationships
				`, map[string]interface{}{}); err != nil {
			}
		} else {
			continue
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

		all[cloudProvider] = AttackPaths{
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
	sum_sum_cve_, _ := record["sum_sum_cve"]
	sum_sum_secrets_, _ := record["sum_sum_secrets"]
	sum_sum_compliance_, _ := record["sum_sum_compliance"]
	sum_sum_cloud_compliance_, _ := record["sum_sum_cloud_compliance"]
	node_count, _ := record["count_*"]
	collect_node_id_, _ := record["collect_node_id"]
	collect_num_cve_, _ := record["collect_vulnerabilities_count"]
	collect_num_secrets_, _ := record["collect_secrets_count"]
	collect_num_compliance_, _ := record["collect_compliances_count"]
	collect_num_cloud_compliance_, _ := record["collect_cloud_compliances_count"]

	collect_node_id := []string{}
	for _, v := range collect_node_id_.([]interface{}) {
		collect_node_id = append(collect_node_id, v.(string))
	}

	collect_num_cve := []int64{}
	sum_sum_cve := int64(0)
	if collect_num_cve_ != nil {
		for _, v := range collect_num_cve_.([]interface{}) {
			collect_num_cve = append(collect_num_cve, v.(int64))
		}
		sum_sum_cve, _ = sum_sum_cve_.(int64)
	}

	collect_num_secrets := []int64{}
	sum_sum_secrets := int64(0)
	if collect_num_secrets_ != nil {
		for _, v := range collect_num_secrets_.([]interface{}) {
			collect_num_secrets = append(collect_num_secrets, v.(int64))
		}
		sum_sum_secrets = sum_sum_secrets_.(int64)
	}

	collect_num_compliance := []int64{}
	sum_sum_compliance := int64(0)
	if collect_num_compliance_ != nil {
		for _, v := range collect_num_compliance_.([]interface{}) {
			collect_num_compliance = append(collect_num_compliance, v.(int64))
		}
		sum_sum_compliance = sum_sum_compliance_.(int64)
	}

	collect_num_cloud_compliance := []int64{}
	sum_sum_cloud_compliance := int64(0)
	if collect_num_cloud_compliance_ != nil {
		for _, v := range collect_num_cloud_compliance_.([]interface{}) {
			collect_num_cloud_compliance = append(collect_num_cloud_compliance, v.(int64))
		}
		sum_sum_cloud_compliance = sum_sum_cloud_compliance_.(int64)
	}

	return AttackPathData{
		identity:                     node.Id,
		Node_type:                    Node_type.(string),
		cloud_provider:               cloud_provider.(string),
		depth:                        depth.(int64),
		sum_sum_cve:                  sum_sum_cve,
		sum_sum_secrets:              sum_sum_secrets,
		sum_sum_compliance:           sum_sum_compliance,
		sum_sum_cloud_compliance:     sum_sum_cloud_compliance,
		node_count:                   node_count.(int64),
		collect_node_id:              collect_node_id,
		collect_num_cve:              collect_num_cve,
		collect_num_secrets:          collect_num_secrets,
		collect_num_compliance:       collect_num_compliance,
		collect_num_cloud_compliance: collect_num_cloud_compliance,
	}
}

type AttackPathData struct {
	identity                     int64
	Node_type                    string
	cloud_provider               string
	depth                        int64
	sum_sum_cve                  int64
	sum_sum_secrets              int64
	sum_sum_compliance           int64
	sum_sum_cloud_compliance     int64
	node_count                   int64
	collect_node_id              []string
	collect_num_cve              []int64
	collect_num_secrets          []int64
	collect_num_compliance       []int64
	collect_num_cloud_compliance []int64
}

func getThreatNodeId(apd AttackPathData) string {
	h := sha256.New()
	v := []string{}
	for i := range apd.collect_node_id {
		v = append(v, apd.collect_node_id[i])
	}
	sort.Strings(v)

	for _, s := range v {
		h.Write([]byte(s))
	}

	return hex.EncodeToString(h.Sum(nil))
}

func (ap AttackPaths) getNodeInfos() map[int64]ThreatNodeInfo {
	res := map[int64]ThreatNodeInfo{}
	for _, v := range ap.nodes_data {
		var Label, Id string
		Id = getThreatNodeId(v)
		switch v.Node_type {
		case "host":
			Label = "Compute Instance"
		case "container":
			Label = "Container"
		case "internet":
			Label = "The Internet"
			Id = "The Internet"
		default:
			Label = "CloudResource"
		}
		Nodes := map[string]NodeInfo{}
		for i, Node_id := range v.collect_node_id {
			vuln_count := int64(0)
			if len(v.collect_num_cve) == len(v.collect_node_id) {
				vuln_count = v.collect_num_cve[i]
			}
			secrets_count := int64(0)
			if len(v.collect_num_secrets) == len(v.collect_node_id) {
				secrets_count = v.collect_num_secrets[i]
			}
			compliance_count := int64(0)
			if len(v.collect_num_compliance) == len(v.collect_node_id) {
				compliance_count = v.collect_num_compliance[i]
			}
			cloud_compliance_count := int64(0)
			if len(v.collect_num_cloud_compliance) == len(v.collect_node_id) {
				cloud_compliance_count = v.collect_num_cloud_compliance[i]
			}
			Nodes[Node_id] = NodeInfo{
				Node_id:               Node_id,
				Name:                  Node_id,
				Vulnerability_count:   vuln_count,
				Secrets_count:         secrets_count,
				Compliance_count:      compliance_count,
				CloudCompliance_count: cloud_compliance_count,
			}
		}
		res[v.identity] = ThreatNodeInfo{
			Label:                 Label,
			Id:                    Id,
			Nodes:                 Nodes,
			Vulnerability_count:   v.sum_sum_cve,
			Secrets_count:         v.sum_sum_secrets,
			Compliance_count:      v.sum_sum_compliance,
			CloudCompliance_count: v.sum_sum_cloud_compliance,
			Count:                 int64(len(v.collect_node_id)),
			Node_type:             v.Node_type,
			Attack_path:           [][]string{},
		}
	}
	return res
}

type ThreatGraph map[string]ProviderThreatGraph

type ProviderThreatGraph struct {
	Resources             []ThreatNodeInfo `json:"resources" required:"true"`
	Compliance_count      int64            `json:"compliance_count" required:"true"`
	Secrets_count         int64            `json:"secrets_count" required:"true"`
	Vulnerability_count   int64            `json:"vulnerability_count" required:"true"`
	CloudCompliance_count int64            `json:"cloud_compliance_count" required:"true"`
}

type ThreatNodeInfo struct {
	Label string              `json:"label" required:"true"`
	Id    string              `json:"id" required:"true"`
	Nodes map[string]NodeInfo `json:"nodes" required:"true"`

	Vulnerability_count   int64 `json:"vulnerability_count" required:"true"`
	Secrets_count         int64 `json:"secrets_count" required:"true"`
	Compliance_count      int64 `json:"compliance_count" required:"true"`
	CloudCompliance_count int64 `json:"cloud_compliance_count" required:"true"`
	Count                 int64 `json:"count" required:"true"`

	Node_type string `json:"node_type" required:"true"`

	Attack_path [][]string `json:"attack_path" required:"true"`
}

type NodeInfo struct {
	Node_id               string `json:"node_id" required:"true"`
	Name                  string `json:"name" required:"true"`
	Vulnerability_count   int64  `json:"vulnerability_count" required:"true"`
	Secrets_count         int64  `json:"secrets_count" required:"true"`
	Compliance_count      int64  `json:"compliance_count" required:"true"`
	CloudCompliance_count int64  `json:"cloud_compliance_count" required:"true"`
}
