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
		MATCH (v:Vulnerability)
		WITH v, CASE WHEN v.cve_attack_vector =~ ".*AV:N.*" THEN 1 ELSE 0 END as score
		SET v.exploitability_score = score`,
		map[string]interface{}{}); err != nil {
		return err
	}

	// First OPTIONAL applies for Containers & Images
	// Second OPTIONAL applies for Hosts
	if _, err = tx.Run(`
		MATCH (s:VulnerabilityScan) -[r:SCANNED]- (n)
		WITH max(s.updated_at) as latest, n
		MATCH (v:Vulnerability) -[:DETECTED]- (m:VulnerabilityScan{updated_at: latest}) -[:SCANNED]- (n)
		OPTIONAL MATCH (n) -[o:HOSTS]- (:Node) <-[r:CONNECTS]- (:Node{node_id:"in-the-internet"})
		SET v.exploitability_score = v.exploitability_score + CASE WHEN r IS NULL OR o IS NULL OR v.exploitability_score = 0 THEN 0 ELSE 1 END
		WITH n, v
		OPTIONAL MATCH (n) <-[r:CONNECTS]- (:Node{node_id:"in-the-internet"})
		SET v.exploitability_score = v.exploitability_score + CASE WHEN r IS NULL OR v.exploitability_score = 0 THEN 0 ELSE 1 END`,
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
