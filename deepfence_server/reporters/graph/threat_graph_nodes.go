package reporters_graph

import (
	"context"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/dbtype"
)

type VulnerabilityThreatGraphRequest struct {
	GraphType string `json:"graph_type" validate:"required,oneof=most_vulnerable_attack_paths direct_internet_exposure indirect_internet_exposure" required:"true" enum:"most_vulnerable_attack_paths,direct_internet_exposure,indirect_internet_exposure"`
}

type VulnerabilityThreatGraph struct {
	AttackPath      [][]string    `json:"attack_path"`
	CveAttackVector string        `json:"cve_attack_vector"`
	CveID           []string      `json:"cve_id"`
	Ports           []interface{} `json:"ports"`
}

func GetVulnerabilityThreatGraph(ctx context.Context, graphType string) ([]VulnerabilityThreatGraph, error) {
	vulnerabilityThreatGraph := []VulnerabilityThreatGraph{}

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return vulnerabilityThreatGraph, err
	}

	session, err := driver.Session(neo4j.AccessModeRead)

	if err != nil {
		return vulnerabilityThreatGraph, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(60 * time.Second))
	if err != nil {
		return vulnerabilityThreatGraph, err
	}
	defer tx.Close()

	res, err := tx.Run(`
		MATCH (n:Node{node_id:"in-the-internet"}) -[:CONNECTS*1..3]-> (m)
		WITH DISTINCT m.node_id as id, m.vulnerabilities_count as count
		WHERE count > 0
		RETURN id
		ORDER BY count DESC
		LIMIT 5
	`, map[string]interface{}{})
	if err != nil {
		return nil, err
	}

	recs, err := res.Collect()

	if err != nil {
		return vulnerabilityThreatGraph, err
	}

	node_ids := []string{}
	for _, rec := range recs {
		node_ids = append(node_ids, rec.Values[0].(string))
	}

	res, err = tx.Run(`
		MATCH (n)
		WHERE (n:Node OR n:Container) AND n.node_id IN $node_ids
		WITH n
		CALL {
		    WITH n
		    MATCH (n) -[:SCANNED]- () -[:DETECTED]- (v:Vulnerability)
		    WITH v limit 3
		    RETURN v
		    ORDER by v.exploitability_score DESC
		}
		RETURN n.node_id, collect(v.node_id)
	`, map[string]interface{}{"node_ids": node_ids})
	if err != nil {
		return nil, err
	}

	recs, err = res.Collect()

	if err != nil {
		return vulnerabilityThreatGraph, err
	}

	cve_ids := map[string][]string{}
	for _, rec := range recs {
		node_id := rec.Values[0].(string)
		for _, cve_id := range rec.Values[1].([]any) {
			cve_ids[node_id] = append(cve_ids[node_id], cve_id.(string))
		}
	}

	res, err = tx.Run(`
		MATCH p=shortestPath((n:Node{node_id:'in-the-internet'}) -[:CONNECTS*1..3]-> (m:Node))
		WHERE m.node_id IN $node_ids
		RETURN m.node_id, p
	`, map[string]interface{}{"node_ids": node_ids})
	if err != nil {
		return nil, err
	}

	recs, err = res.Collect()

	if err != nil {
		return vulnerabilityThreatGraph, err
	}

	attack_paths := map[string][]string{}
	ports := map[string]map[int]struct{}{}
	for _, rec := range recs {
		node_id := rec.Values[0].(string)
		paths := rec.Values[1].(dbtype.Path)
		for _, node := range paths.Nodes {
			attack_paths[node_id] = append(attack_paths[node_id], node.Props["node_id"].(string))
		}
		last_connects := paths.Relationships[len(paths.Relationships)-1]
		for _, port := range last_connects.Props["right_pids"].([]interface{}) {
			if _, has := ports[node_id]; !has {
				ports[node_id] = map[int]struct{}{}
			}
			ports[node_id][int(port.(int64))] = struct{}{}
		}
	}

	for _, node_id := range node_ids {
		output_ports := []interface{}{}
		for port := range ports[node_id] {
			output_ports = append(output_ports, port)
		}
		vulnerabilityThreatGraph = append(vulnerabilityThreatGraph, VulnerabilityThreatGraph{
			AttackPath:      [][]string{attack_paths[node_id]},
			CveAttackVector: "network",
			CveID:           cve_ids[node_id],
			Ports:           output_ports,
		})
	}

	return vulnerabilityThreatGraph, nil
}
