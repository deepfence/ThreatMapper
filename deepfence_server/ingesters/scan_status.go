package ingesters

import (
	"context"
	"fmt"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

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

	if _, err = tx.Run(fmt.Sprintf("MERGE (n:%s{node_id: $scan_id}) SET n.status = $status", scan_type),
		map[string]interface{}{"scan_id": scan_id, "status": status}); err != nil {
		return err
	}

	return tx.Commit()
}
