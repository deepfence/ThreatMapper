package cloudscanner_diagnosis //nolint:stylecheck

import (
	"context"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/diagnosis"
	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func GetHostIDs(ctx context.Context, nodeIdentifiers []diagnosis.NodeIdentifier) ([]diagnosis.NodeIdentifier,
	error) {

	hostIDs := make([]diagnosis.NodeIdentifier, 0)
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return hostIDs, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return hostIDs, err
	}

	defer tx.Close(ctx)

	nodeIDs := make([]string, len(nodeIdentifiers))
	for i, n := range nodeIdentifiers {
		nodeIDs[i] = n.NodeID
	}

	res, err := tx.Run(ctx, `MATCH (n:CloudNode) -[:HOSTS]- (h)
		WHERE n.node_id IN $node_ids and h.active=true
		RETURN h.node_id, n.node_id`,
		map[string]interface{}{
			"node_ids": nodeIDs})
	if err != nil {
		return hostIDs, err
	}

	rec, err := res.Collect(ctx)
	if err != nil {
		return hostIDs, err
	}

	nodeType := controls.ResourceTypeToString(controls.Host)
	foundNodeIDs := make(map[string]bool)
	for i := range rec {
		hostID := rec[i].Values[0].(string)
		nodeID := rec[i].Values[1].(string)
		foundNodeIDs[nodeID] = true
		hostIDs = append(hostIDs, diagnosis.NodeIdentifier{NodeID: hostID,
			NodeType: nodeType})
	}

	var missingNodes []string
	for _, nodeID := range nodeIDs {
		if _, ok := foundNodeIDs[nodeID]; !ok {
			missingNodes = append(missingNodes, nodeID)
		}
	}

	if len(missingNodes) > 0 {
		return hostIDs, fmt.Errorf("could not find nodes %v", missingNodes)
	}

	return hostIDs, nil
}
