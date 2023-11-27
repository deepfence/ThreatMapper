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

var (
	MaxStops    = 5
	MissingNode = errors.New("Missing node_id")
)

func GetAgentActions(ctx context.Context, nodeId string,
	work_num_to_extract int) ([]controls.Action, []error) {

	// Append more actions here
	actions := []controls.Action{}

	// early return to avoid unnecessary checks
	if err := CheckNodeExist(ctx, nodeId); err != nil {
		log.Info().Msgf("Missing node: %s.... Skipping all actions", nodeId)
		actions = []controls.Action{}
		return actions, []error{}
	}

	//Extract the stop scans requests
	stop_actions, stop_actions_err := ExtractStoppingAgentScans(ctx, nodeId, MaxStops)
	if stop_actions_err == nil {
		actions = append(actions, stop_actions...)
	}

	if work_num_to_extract == 0 {
		if stop_actions_err != nil {
			return actions, []error{stop_actions_err}
		} else {
			return actions, []error{}
		}
	}

	upgrade_actions, upgrade_err := ExtractPendingAgentUpgrade(ctx, nodeId, work_num_to_extract)
	work_num_to_extract -= len(upgrade_actions)
	if upgrade_err == nil {
		actions = append(actions, upgrade_actions...)
	}

	scan_actions, scan_err := ExtractStartingAgentScans(ctx, nodeId, work_num_to_extract)
	work_num_to_extract -= len(scan_actions)
	if scan_err == nil {
		actions = append(actions, scan_actions...)
	}

	diagnosticLogActions, scan_log_err := ExtractAgentDiagnosticLogRequests(ctx, nodeId, controls.Host, work_num_to_extract)
	work_num_to_extract -= len(diagnosticLogActions)
	if scan_err == nil {
		actions = append(actions, diagnosticLogActions...)
	}

	return actions, []error{scan_err, upgrade_err, scan_log_err}
}

func GetPendingAgentScans(ctx context.Context, nodeId string, availableWorkload int) ([]controls.Action, error) {
	res := []controls.Action{}
	if len(nodeId) == 0 {
		return res, MissingNode
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasPendingAgentScans(client, nodeId, availableWorkload); !has || err != nil {
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
		map[string]interface{}{"id": nodeId})

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

func hasAgentDiagnosticLogRequests(client neo4j.Driver, nodeId string, nodeType controls.ScanResource, max_work int) (bool, error) {

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
		map[string]interface{}{"id": nodeId, "max_work": max_work})

	if err != nil {
		return false, err
	}

	records, err := r.Collect()
	return len(records) != 0, err
}

func ExtractAgentDiagnosticLogRequests(ctx context.Context, nodeId string, nodeType controls.ScanResource, max_work int) ([]controls.Action, error) {
	res := []controls.Action{}
	if len(nodeId) == 0 {
		return res, MissingNode
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasAgentDiagnosticLogRequests(client, nodeId, nodeType, max_work); !has || err != nil {
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

	if len(res) != 0 {
		err = tx.Commit()
	}

	return res, err

}

func hasPendingAgentScans(client neo4j.Driver, nodeId string, max_work int) (bool, error) {
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
		map[string]interface{}{"id": nodeId, "max_work": max_work})

	if err != nil {
		return false, err
	}

	records, err := r.Collect()
	return len(records) != 0, err
}

func ExtractStartingAgentScans(ctx context.Context, nodeId string,
	max_work int) ([]controls.Action, error) {

	res := []controls.Action{}
	if len(nodeId) == 0 {
		return res, MissingNode
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasPendingAgentScans(client, nodeId, max_work); !has || err != nil {
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

	if len(res) != 0 {
		err = tx.Commit()
	}

	return res, err

}

func ExtractStoppingAgentScans(ctx context.Context, nodeId string,
	max_work int) ([]controls.Action, error) {

	res := []controls.Action{}
	if len(nodeId) == 0 {
		return res, MissingNode
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

func hasPendingAgentUpgrade(client neo4j.Driver, nodeId string, max_work int) (bool, error) {
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
		map[string]interface{}{"id": nodeId, "max_work": max_work})

	if err != nil {
		return false, err
	}

	records, err := r.Collect()
	return len(records) != 0, err
}

func ExtractPendingAgentUpgrade(ctx context.Context, nodeId string, max_work int) ([]controls.Action, error) {
	res := []controls.Action{}
	if len(nodeId) == 0 {
		return res, MissingNode
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasPendingAgentUpgrade(client, nodeId, max_work); !has || err != nil {
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

	if len(res) != 0 {
		err = tx.Commit()
	}

	return res, err

}

func CheckNodeExist(ctx context.Context, nodeId string) error {

	if len(nodeId) == 0 {
		return MissingNode
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
		map[string]interface{}{"id": nodeId})

	if err != nil {
		return err
	}

	_, err = r.Single()

	if err != nil {
		return MissingNode
	}

	return nil
}
