package reporters_graph //nolint:stylecheck

import (
	"context"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/dbtype"
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

func GetIndividualThreatGraph[T reporters.Cypherable](ctx context.Context, graphType string, selectedNodeIDs []string) ([]IndividualThreatGraph, error) {
	individualThreatGraph := []IndividualThreatGraph{}

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return individualThreatGraph, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(60*time.Second))
	if err != nil {
		return individualThreatGraph, err
	}
	defer tx.Close(ctx)

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

	res, err := tx.Run(ctx, query, map[string]interface{}{})
	if err != nil {
		return nil, err
	}

	recs, err := res.Collect(ctx)

	if err != nil {
		return individualThreatGraph, err
	}

	nodeIDs := []string{}
	if len(selectedNodeIDs) == 0 {
		for _, rec := range recs {
			nodeIDs = append(nodeIDs, rec.Values[0].(string))
		}
	} else {
		for _, rec := range recs {
			for _, s := range selectedNodeIDs {
				if s == rec.Values[0].(string) {
					nodeIDs = append(nodeIDs, s)
				}
			}
		}
	}

	// Early return
	if len(nodeIDs) == 0 {
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
	res, err = tx.Run(ctx, query, map[string]interface{}{"node_ids": nodeIDs})
	if err != nil {
		return nil, err
	}

	recs, err = res.Collect(ctx)
	if err != nil {
		return individualThreatGraph, err
	}

	cveIDs := map[string][]string{}
	for _, rec := range recs {
		nodeID := rec.Values[0].(string)
		for _, cveID := range rec.Values[1].([]any) {
			cveIDs[nodeID] = append(cveIDs[nodeID], cveID.(string))
		}
	}

	res, err = tx.Run(ctx, `
		MATCH p=shortestPath((n:Node{node_id:'in-the-internet'}) -[:CONNECTS*1..3]-> (m:Node))
		WHERE m.node_id IN $node_ids
		RETURN m.node_id, p
	`, map[string]interface{}{"node_ids": nodeIDs})
	if err != nil {
		return nil, err
	}

	recs, err = res.Collect(ctx)

	if err != nil {
		return individualThreatGraph, err
	}

	attackPaths := map[string][]string{}
	ports := map[string]map[int]struct{}{}
	for _, rec := range recs {
		nodeID := rec.Values[0].(string)
		paths := rec.Values[1].(dbtype.Path)
		for _, node := range paths.Nodes {
			attackPaths[nodeID] = append(attackPaths[nodeID], node.Props["node_id"].(string))
		}
		lastConnects := paths.Relationships[len(paths.Relationships)-1]
		//TODO: remove
		if lastConnects.Props["local_ports"] == nil {
			continue
		}
		for _, port := range lastConnects.Props["local_ports"].([]interface{}) {
			if _, has := ports[nodeID]; !has {
				ports[nodeID] = map[int]struct{}{}
			}
			ports[nodeID][int(port.(int64))] = struct{}{}
		}
	}

	for _, nodeID := range nodeIDs {
		outputPorts := []interface{}{}
		for port := range ports[nodeID] {
			outputPorts = append(outputPorts, port)
		}
		individualThreatGraph = append(individualThreatGraph, IndividualThreatGraph{
			AttackPath:      [][]string{attackPaths[nodeID]},
			CveAttackVector: "network",
			CveID:           cveIDs[nodeID],
			Ports:           outputPorts,
		})
	}

	return individualThreatGraph, nil
}
