package controls

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	maxWork = 5
)

var (
	ErrMissingNodeID = errors.New("missing node_id")
)

func GetAgentActions(ctx context.Context, nodeID string, workNumToExtract int) ([]controls.Action, []error) {

	// Append more actions here
	actions := []controls.Action{}

	// early return to avoid unnecessary checks
	if err := CheckNodeExist(ctx, nodeID); err != nil {
		log.Info().Msgf("Missing node: %s.... Skipping all actions", nodeID)
		actions = []controls.Action{}
		return actions, []error{}
	}

	// Extract the stop scans requests
	stopActions, stopActionsErr := ExtractStoppingAgentScans(ctx, nodeID, maxWork)
	if stopActionsErr == nil {
		actions = append(actions, stopActions...)
	}

	// Diagnostic logs not part of workNumToExtract
	diagnosticLogActions, diagnosticLogErr := ExtractAgentDiagnosticLogRequests(ctx, nodeID, controls.Host, maxWork)
	if diagnosticLogErr == nil {
		actions = append(actions, diagnosticLogActions...)
	}

	if workNumToExtract == 0 {
		return actions, []error{stopActionsErr, diagnosticLogErr}
	}

	upgradeActions, upgradeErr := ExtractPendingAgentUpgrade(ctx, nodeID, workNumToExtract)
	workNumToExtract -= len(upgradeActions)
	if upgradeErr == nil {
		actions = append(actions, upgradeActions...)
	}

	scanActions, scanErr := ExtractStartingAgentScans(ctx, nodeID, workNumToExtract)
	workNumToExtract -= len(scanActions)
	if scanErr == nil {
		actions = append(actions, scanActions...)
	}

	return actions, []error{scanErr, upgradeErr, diagnosticLogErr, stopActionsErr}
}

func GetPendingAgentScans(ctx context.Context, nodeID string, availableWorkload int) ([]controls.Action, error) {
	res := []controls.Action{}
	if len(nodeID) == 0 {
		return res, ErrMissingNodeID
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasPendingAgentScans(client, nodeID, availableWorkload); !has || err != nil {
		return res, err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	r, err := tx.Run(`
		MATCH (s) -[:SCHEDULED]-> (n:Node{node_id:$id})
		WHERE s.status = '`+utils.ScanStatusInProgress+`'
		AND s.retries < 3
		SET s.retries = s.retries + 1
		WITH s
		RETURN s.trigger_action
		ORDER BY s.is_priority DESC, s.updated_at ASC`,
		map[string]interface{}{"id": nodeID})

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

	if len(res) != 0 {
		err = tx.Commit()
	}

	return res, err

}

func hasAgentDiagnosticLogRequests(client neo4j.Driver, nodeID string, nodeType controls.ScanResource, maxWork int) (bool, error) {

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return false, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (s:AgentDiagnosticLogs) -[:SCHEDULEDLOGS]-> (n{node_id:$id})
		WHERE (n:`+controls.ResourceTypeToNeo4j(nodeType)+`)
		AND s.status = '`+utils.ScanStatusStarting+`'
		AND s.retries < 3
		WITH s LIMIT $max_work
		WITH s
		RETURN s.trigger_action`,
		map[string]interface{}{"id": nodeID, "max_work": maxWork})

	if err != nil {
		return false, err
	}

	records, err := r.Collect()
	return len(records) != 0, err
}

func ExtractAgentDiagnosticLogRequests(ctx context.Context, nodeID string, nodeType controls.ScanResource, maxWork int) ([]controls.Action, error) {
	res := []controls.Action{}
	if len(nodeID) == 0 {
		return res, ErrMissingNodeID
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasAgentDiagnosticLogRequests(client, nodeID, nodeType, maxWork); !has || err != nil {
		return res, err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (s:AgentDiagnosticLogs) -[:SCHEDULEDLOGS]-> (n{node_id:$id})
		WHERE (n:`+controls.ResourceTypeToNeo4j(nodeType)+`)
		AND s.status = '`+utils.ScanStatusStarting+`'
		AND s.retries < 3
		WITH s LIMIT $max_work
		SET s.status = '`+utils.ScanStatusInProgress+`'
		WITH s
		RETURN s.trigger_action`,
		map[string]interface{}{"id": nodeID, "max_work": maxWork})
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

	if len(res) != 0 {
		err = tx.Commit()
	}

	return res, err

}

func hasPendingAgentScans(client neo4j.Driver, nodeID string, maxWork int) (bool, error) {
	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return false, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (s) -[:SCHEDULED]-> (n:Node{node_id:$id})
		WHERE s.status = '`+utils.ScanStatusStarting+`'
		AND s.retries < 3
		WITH s LIMIT $max_work
		RETURN s.trigger_action`,
		map[string]interface{}{"id": nodeID, "max_work": maxWork})

	if err != nil {
		return false, err
	}

	records, err := r.Collect()
	return len(records) != 0, err
}

func ExtractStartingAgentScans(ctx context.Context, nodeID string, maxWork int) ([]controls.Action, error) {

	res := []controls.Action{}
	if len(nodeID) == 0 {
		return res, ErrMissingNodeID
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasPendingAgentScans(client, nodeID, maxWork); !has || err != nil {
		return res, err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (s) -[:SCHEDULED]-> (n:Node{node_id:$id})
		WHERE s.status = '`+utils.ScanStatusStarting+`'
		AND s.retries < 3
		WITH s ORDER BY s.is_priority DESC, s.updated_at ASC LIMIT $max_work
		SET s.status = '`+utils.ScanStatusInProgress+`', s.updated_at = TIMESTAMP()
		WITH s
		RETURN s.trigger_action`,
		map[string]interface{}{"id": nodeID, "max_work": maxWork})

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

	if len(res) != 0 {
		err = tx.Commit()
	}

	return res, err

}

func ExtractStoppingAgentScans(ctx context.Context, nodeID string, maxWrok int) ([]controls.Action, error) {

	res := []controls.Action{}
	if len(nodeID) == 0 {
		return res, ErrMissingNodeID
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (s) -[:SCHEDULED]-> (n:Node{node_id:$id})
		WHERE s.status = '`+utils.ScanStatusCancelPending+`'
		WITH s LIMIT $max_work
        SET s.status = '`+utils.ScanStatusCancelling+`', s.updated_at = TIMESTAMP()
		WITH s
		RETURN s.trigger_action`,
		map[string]interface{}{"id": nodeID, "max_work": maxWrok})

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
			log.Error().Msgf("ExtractStoppingAgentScans Unmarshal of action failed: %v", err)
			continue
		}
		switch action.ID {
		case controls.StartSecretScan:
			action.ID = controls.StopSecretScan
		case controls.StartMalwareScan:
			action.ID = controls.StopMalwareScan
		case controls.StartVulnerabilityScan:
			action.ID = controls.StopVulnerabilityScan
		case controls.StartComplianceScan:
			action.ID = controls.StopComplianceScan
		default:
			log.Info().Msgf("Stop functionality not implemented for action: %d", action.ID)
			continue
		}
		res = append(res, action)
	}

	if len(res) != 0 {
		err = tx.Commit()
	}

	return res, err

}

func hasPendingAgentUpgrade(client neo4j.Driver, nodeID string, maxWork int) (bool, error) {
	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return false, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (s:AgentVersion) -[r:SCHEDULED]-> (n:Node{node_id:$id})
		WHERE r.status = '`+utils.ScanStatusStarting+`'
		AND r.retries < 3
		WITH r LIMIT $max_work
		RETURN r.trigger_action`,
		map[string]interface{}{"id": nodeID, "max_work": maxWork})

	if err != nil {
		return false, err
	}

	records, err := r.Collect()
	return len(records) != 0, err
}

func ExtractPendingAgentUpgrade(ctx context.Context, nodeID string, maxWork int) ([]controls.Action, error) {
	res := []controls.Action{}
	if len(nodeID) == 0 {
		return res, ErrMissingNodeID
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasPendingAgentUpgrade(client, nodeID, maxWork); !has || err != nil {
		return res, err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (s:AgentVersion) -[r:SCHEDULED]-> (n:Node{node_id:$id})
		WHERE r.status = '`+utils.ScanStatusStarting+`'
		AND r.retries < 3
		WITH r LIMIT $max_work
		SET r.status = '`+utils.ScanStatusInProgress+`'
		WITH r
		RETURN r.trigger_action`,
		map[string]interface{}{"id": nodeID, "max_work": maxWork})

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

	if len(res) != 0 {
		err = tx.Commit()
	}

	return res, err

}

func CheckNodeExist(ctx context.Context, nodeID string) error {

	if len(nodeID) == 0 {
		return ErrMissingNodeID
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	r, err := tx.Run(`
		MATCH (n:Node{node_id:$id})
		RETURN n.node_id`,
		map[string]interface{}{"id": nodeID})

	if err != nil {
		return err
	}

	_, err = r.Single()

	if err != nil {
		return ErrMissingNodeID
	}

	return nil
}
