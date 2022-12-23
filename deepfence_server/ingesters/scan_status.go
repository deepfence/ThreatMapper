package ingesters

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type AlreadyRunningScanError struct {
	scan_id   string
	scan_type string
	node_id   string
}

func (ve *AlreadyRunningScanError) Error() string {
	return fmt.Sprintf("Scan of type %s already running for %s, id: %s", ve.scan_type, ve.node_id, ve.scan_id)
}

func AddNewScan(ctx context.Context, scan_type utils.Neo4jScanType, scan_id string, node_id string, action controls.Action) error {

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

	res, err := tx.Run(fmt.Sprintf("OPTIONAL MATCH (n:%s)-[:SCANNED]->(:Node{node_id:$node_id}) WHERE NOT n.status = 'COMPLETE' return n.node_id", scan_type), map[string]interface{}{"node_id": node_id})
	if err != nil {
		return err
	}

	rec, err := res.Single()
	if err != nil {
		return err
	}

	if rec.Values[0] != nil {
		return &AlreadyRunningScanError{
			scan_id:   rec.Values[0].(string),
			node_id:   node_id,
			scan_type: string(scan_type),
		}
	}

	b, err := json.Marshal(action)
	if err != nil {
		return err
	}

	if _, err = tx.Run(fmt.Sprintf("MERGE (n:%s{node_id: $scan_id, status: $status, retries: 0, trigger_action: $action, updated_at: TIMESTAMP()}) MERGE (m:Node{node_id:$node_id}) MERGE (n)-[:SCANNED]->(m)", scan_type),
		map[string]interface{}{"scan_id": scan_id, "status": utils.SCAN_STATUS_STARTING, "node_id": node_id, "action": string(b)}); err != nil {
		return err
	}

	return tx.Commit()
}

func UpdateScanStatus(ctx context.Context, scan_type string, scan_id string, status string) error {

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

	if _, err = tx.Run(fmt.Sprintf("MERGE (n:%s{node_id: $scan_id}) SET n.status = $status, updated_at = TIMESTAMP()", scan_type),
		map[string]interface{}{"scan_id": scan_id, "status": status}); err != nil {
		return err
	}

	return tx.Commit()
}
