package reporters_scan

import (
	"context"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func UpdateScanResult(ctx context.Context, scanType utils.Neo4jScanType, nodeIds []string, key, value string) error {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	_, err = tx.Run(`
		MATCH (m:`+string(scanType)+`) -[:DETECTED]-> (n)
		WHERE n.node_id IN $node_ids
		SET n.`+key+` = $value`, map[string]interface{}{"node_ids": nodeIds, "value": value})
	if err != nil {
		return err
	}
	return tx.Commit()
}

func DeleteScanResult(ctx context.Context, scanType utils.Neo4jScanType, nodeIds []string) error {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	_, err = tx.Run(`
		MATCH (m:`+string(scanType)+`) -[:DETECTED]-> (n)
		WHERE n.node_id IN $node_ids
		DETACH DELETE n`, map[string]interface{}{"node_ids": nodeIds})
	if err != nil {
		return err
	}
	return tx.Commit()
}

func NotifyScanResult(ctx context.Context, scanType utils.Neo4jScanType, scanIDs []string) error {
	return nil
}
