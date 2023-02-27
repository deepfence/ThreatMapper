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

	// First OPTIONAL applies for Hosts
	// Second OPTIONAL applies for Containers & Images
	if _, err = tx.Run(`
		MATCH (n:Vulnerability) -[:DETECTED]- (m)
		SET n.exploitability_score = 0
		WITH max(m.updated_at) as latest, m, n
		WITH n, CASE WHEN n.cve_attack_vector =~ ".*AV:N.*" THEN 1 ELSE 0 END as score
		OPTIONAL MATCH (m) -[:SCANNED]- (l:Node) <-[r:CONNECTS]- (o{node_id:"in-the-internet"})
		WITH m, n, score, CASE WHEN r IS NOT NULL THEN 2 ELSE 1 END as is_incoming
		SET n.exploitability_score = n.exploitability_score + score * is_incoming
		WITH m, n, score
		OPTIONAL MATCH (m) -[:SCANNED]- (l) -[:HOSTS]- (n:Node) <-[r:CONNECTS]- (o{node_id:"in-the-internet"})
		WITH n, score, CASE WHEN r IS NOT NULL THEN 2 ELSE 1 END as is_incoming
		SET n.exploitability_score = n.exploitability_score + score * is_incoming`,
		map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Secret)
		SET n.exploitability_score = 0`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Malware)
		SET n.exploitability_score = 0`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Compliance)
		SET n.exploitability_score = 0`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:CloudCompliance)
		SET n.exploitability_score = 0`, map[string]interface{}{}); err != nil {
		return err
	}

	return tx.Commit()
}
