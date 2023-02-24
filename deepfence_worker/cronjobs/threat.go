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

	if _, err = tx.Run(`
		MATCH (n:Vulnerability) -[:DETECTED]- (m)
		WITH max(m.updated_at) as latest, m, n
		MATCH (m) -[:SCANNED]- (l) -[r:CONNECTS]- (o)
		WITH n, CASE WHEN n.cve_attack_vector =~ ".*AV:N.*" THEN 2 ELSE 1 END as score, count(r) as incoming
		SET n.exploitability_score = score * incoming`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Secret) -[:DETECTED]- (m)
		WITH max(m.updated_at) as latest, m, n
		MATCH (m) -[:SCANNED]- (l) -[r:CONNECTS]- (o)
		WITH n, 1 as score, count(r) as incoming
		SET n.exploitability_score = score * incoming`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Malware) -[:DETECTED]- (m)
		WITH max(m.updated_at) as latest, m, n
		MATCH (m) -[:SCANNED]- (l) -[r:CONNECTS]- (o)
		WITH n, 1 as score, count(r) as incoming
		SET n.exploitability_score = score * incoming`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Compliance) -[:DETECTED]- (m)
		WITH max(m.updated_at) as latest, m, n
		MATCH (m) -[:SCANNED]- (l) -[r:CONNECTS]- (o)
		WITH n, 1 as score, count(r) as incoming
		SET n.exploitability_score = score * incoming`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:CloudCompliance) -[:DETECTED]- (m)
		WITH max(m.updated_at) as latest, m, n
		MATCH (m) -[:SCANNED]- (l) -[r:CONNECTS]- (o)
		WITH n, 1 as score, count(r) as incoming
		SET n.exploitability_score = score * incoming`, map[string]interface{}{}); err != nil {
		return err
	}

	return tx.Commit()
}
