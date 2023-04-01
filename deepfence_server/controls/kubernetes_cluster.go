package controls

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func GetKubernetesClusterActions(ctx context.Context, nodeId string, workNumToExtract int) ([]controls.Action, []error) {
	// Append more actions here
	var actions []controls.Action

	if workNumToExtract == 0 {
		return actions, []error{nil, nil}
	}

	upgradeActions, upgradeErr := ExtractPendingKubernetesClusterUpgrade(ctx, nodeId, workNumToExtract)
	workNumToExtract -= len(upgradeActions)
	if upgradeErr == nil {
		actions = append(actions, upgradeActions...)
	}

	scanActions, scanErr := ExtractStartingKubernetesClusterScans(ctx, nodeId, workNumToExtract)
	workNumToExtract -= len(scanActions)
	if scanErr == nil {
		actions = append(actions, scanActions...)
	}

	diagnosticLogActions, scan_err := ExtractAgentDiagnosticLogRequests(ctx, nodeId, controls.KubernetesCluster, workNumToExtract)
	workNumToExtract -= len(diagnosticLogActions)
	if scan_err == nil {
		actions = append(actions, diagnosticLogActions...)
	}

	return actions, []error{scanErr, upgradeErr}
}

func ExtractStartingKubernetesClusterScans(ctx context.Context, nodeId string, max_work int) ([]controls.Action, error) {
	var res []controls.Action
	if len(nodeId) == 0 {
		return res, errors.New("Missing node_id")
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (s) -[:SCHEDULED]-> (n:KubernetesCluster{node_id:$id})
		WHERE s.status = '`+utils.SCAN_STATUS_STARTING+`'
		AND s.retries < 3
		WITH s LIMIT $max_work
		SET s.status = '`+utils.SCAN_STATUS_INPROGRESS+`'
		WITH s
		RETURN s.trigger_action`,
		map[string]interface{}{"id": nodeId, "max_work": max_work})

	if err != nil {
		return res, err
	}

	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		var action controls.Action
		if record.Values[0] == nil {
			log.Error().Msgf("Invalid neo4j trigger_action result, skipping")
			continue
		}
		err := json.Unmarshal([]byte(record.Values[0].(string)), &action)
		if err != nil {
			log.Error().Msgf("Unmarshal of action failed: %v", err)
			continue
		}
		res = append(res, action)
	}

	return res, tx.Commit()

}

func ExtractPendingKubernetesClusterUpgrade(ctx context.Context, nodeId string, max_work int) ([]controls.Action, error) {
	var res []controls.Action
	if len(nodeId) == 0 {
		return res, errors.New("Missing node_id")
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session, err := client.Session(neo4j.AccessModeWrite)
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (s:AgentVersion) -[r:SCHEDULED]-> (n:KubernetesCluster{node_id:$id})
		WHERE r.status = '`+utils.SCAN_STATUS_STARTING+`'
		AND r.retries < 3
		WITH r LIMIT $max_work
		SET r.status = '`+utils.SCAN_STATUS_INPROGRESS+`'
		WITH r
		RETURN r.trigger_action`,
		map[string]interface{}{"id": nodeId, "max_work": max_work})

	if err != nil {
		return res, err
	}

	records, err := r.Collect()

	if err != nil {
		return res, err
	}

	for _, record := range records {
		var action controls.Action
		if record.Values[0] == nil {
			log.Error().Msgf("Invalid neo4j trigger_action result, skipping")
			continue
		}
		err := json.Unmarshal([]byte(record.Values[0].(string)), &action)
		if err != nil {
			log.Error().Msgf("Unmarshal of action failed: %v", err)
			continue
		}
		res = append(res, action)
	}

	return res, tx.Commit()

}
