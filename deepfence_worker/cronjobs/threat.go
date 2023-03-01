package cronjobs

import (
	"github.com/ThreeDotsLabs/watermill/message"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func ComputeThreat(msg *message.Message) error {
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	// Following cypher queries applies to Vulnerabilities
	if _, err = tx.Run(`
		MATCH (v:Vulnerability)
		WITH v, CASE WHEN v.cve_attack_vector =~ ".*AV:N.*" THEN 2 ELSE CASE WHEN v.cve_severity = 'critical' THEN 1 ELSE 0 END END as score
		SET v.exploitability_score = score,
		v.parsed_attack_vector = CASE WHEN score = 2 THEN 'network' ELSE 'local' END,
		v.has_live_connection = false`,
		map[string]interface{}{}); err != nil {
		return err
	}

	// Following cypher request applies to Images & Containers
	if _, err = tx.Run(`
		MATCH (n:Node{node_id:"in-the-internet"}) -[:CONNECTS*]-> (m:Node)
		WITH DISTINCT m
		MATCH (m) -[:HOSTS]-> (o) <-[:SCANNED]- (s)
		WITH DISTINCT o, max(s.updated_at) as latest, s
		MATCH (s) -[:DETECTED]-> (v:Vulnerability) 
		SET v.exploitability_score = CASE WHEN v.exploitability_score = 2 THEN 3 ELSE v.exploitability_score END, v.has_live_connection = true`,
		map[string]interface{}{}); err != nil {
		return err
	}

	// Following cypher request applies to Hosts
	if _, err = tx.Run(`
		MATCH (n:Node{node_id:"in-the-internet"}) -[:CONNECTS*]-> (m:Node)
		WITH DISTINCT m
		MATCH (m) <-[:SCANNED]- (s)
		WITH DISTINCT m, max(s.updated_at) as latest, s
		MATCH (s) -[:DETECTED]-> (v:Vulnerability) 
		SET v.exploitability_score = CASE WHEN v.exploitability_score = 2 THEN 3 ELSE v.exploitability_score END, v.has_live_connection = true`,
		map[string]interface{}{}); err != nil {
		return err
	}

	return tx.Commit()
}
