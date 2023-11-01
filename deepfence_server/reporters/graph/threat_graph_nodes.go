package reporters_graph

import (
	"context"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/dbtype"
)

type IndividualThreatGraphRequest struct {
	GraphType string   `json:"graph_type" validate:"required,oneof=most_vulnerable_attack_paths direct_internet_exposure indirect_internet_exposure" required:"true" enum:"most_vulnerable_attack_paths,direct_internet_exposure,indirect_internet_exposure"`
	NodeIds   []string `json:"node_ids" required:"false"`
	IssueType string   `json:"issue_type" validate:"required,oneof=vulnerability secret malware compliance cloud_compliance" required:"true" enum:"vulnerability,secret,malware,compliance,cloud_compliance"`
}

type IndividualThreatGraph struct {
	AttackPath      [][]string    `json:"attack_path"`
	CveAttackVector string        `json:"cve_attack_vector"`
	CveID           []string      `json:"cve_id"`
	Ports           []interface{} `json:"ports"`
}

func getNeo4jCountField(v interface{}) string {
	switch v.(type) {
	case model.Vulnerability:
		return "vulnerabilities_count"
	case model.Secret:
		return "secrets_count"
	case model.Malware:
		return "malwares_count"
	case model.Compliance:
		return "compliances_count"
	case model.CloudCompliance:
		return "cloud_compliances_count"
	}
	return "error_thread_graph_nodes"
}

func getNeo4jNodeIDField(v interface{}) string {
	switch v.(type) {
	case model.Vulnerability:
		return "cve_id"
	case model.Secret:
		return "node_id"
	case model.Malware:
		return "node_id"
	case model.Compliance:
		return "node_id"
	case model.CloudCompliance:
		return "node_id"
	}
	return "error_thread_graph_nodes"
}

func GetIndividualThreatGraph[T reporters.Cypherable](ctx context.Context, graphType string, selected_node_ids []string) ([]IndividualThreatGraph, error) {
	individualThreatGraph := []IndividualThreatGraph{}

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return individualThreatGraph, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(60 * time.Second))
	if err != nil {
		return individualThreatGraph, err
	}
	defer tx.Close()

	var dummy T
	query := fmt.Sprintf(`
		MATCH (n:Node{node_id:"in-the-internet"}) -[:CONNECTS*1..3]-> (m)
		WITH DISTINCT m.node_id as id, m.%s as count
		WHERE count > 0
		RETURN id
		ORDER BY count DESC
		LIMIT 5
	`, getNeo4jCountField(dummy))

	log.Debug().Msgf("q: %s", query)

	res, err := tx.Run(query, map[string]interface{}{})
	if err != nil {
		return nil, err
	}

	recs, err := res.Collect()

	if err != nil {
		return individualThreatGraph, err
	}

	node_ids := []string{}
	if len(selected_node_ids) == 0 {
		for _, rec := range recs {
			node_ids = append(node_ids, rec.Values[0].(string))
		}
	} else {
		for _, rec := range recs {
			for _, s := range selected_node_ids {
				if s == rec.Values[0].(string) {
					node_ids = append(node_ids, s)
				}
			}
		}
	}

	// Early return
	if len(node_ids) == 0 {
		return individualThreatGraph, nil
	}

	query = fmt.Sprintf(`
		MATCH (n)
		WHERE (n:Node OR n:Container) AND n.node_id IN $node_ids
		WITH n
		CALL {
		    WITH n
		    MATCH (n) -[:SCANNED]- () -[:DETECTED]- (v:%s)
		    WITH v limit 3
		    RETURN v
		    ORDER by v.exploitability_score DESC
		}
		RETURN n.node_id, collect(v.%s)
	`, dummy.NodeType(), getNeo4jNodeIDField(dummy))

	log.Debug().Msgf("q: %s", query)
	res, err = tx.Run(query, map[string]interface{}{"node_ids": node_ids})
	if err != nil {
		return nil, err
	}

	recs, err = res.Collect()

	if err != nil {
		return individualThreatGraph, err
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
		return individualThreatGraph, err
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
		individualThreatGraph = append(individualThreatGraph, IndividualThreatGraph{
			AttackPath:      [][]string{attack_paths[node_id]},
			CveAttackVector: "network",
			CveID:           cve_ids[node_id],
			Ports:           output_ports,
		})
	}

	return individualThreatGraph, nil
}
