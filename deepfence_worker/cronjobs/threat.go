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
		MATCH (n:Vulnerability)
		SET n.vulnerability_score = RAND()*10`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Secret)
		SET n.vulnerability_score = RAND()*10`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Malware)
		SET n.vulnerability_score = RAND()*10`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Compliance)
		SET n.vulnerability_score = RAND()*10`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:CloudCompliance)
		SET n.vulnerability_score = RAND()*10`, map[string]interface{}{}); err != nil {
		return err
	}

	return tx.Commit()
}
