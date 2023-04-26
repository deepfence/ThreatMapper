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

func GetAgentActions(ctx context.Context, nodeId string, work_num_to_extract int) ([]controls.Action, []error) {
	// Append more actions here
	actions := []controls.Action{}

	if work_num_to_extract == 0 {
		return actions, []error{nil, nil}
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
		return res, errors.New("Missing node_id")
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasPendingAgentScans(client, nodeId, availableWorkload); !has || err != nil {
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

	r, err := tx.Run(`
		MATCH (s) -[:SCHEDULED]-> (n:Node{node_id:$id})
		WHERE s.status = '`+utils.SCAN_STATUS_INPROGRESS+`'
		AND s.retries < 3
		SET s.retries = s.retries + 1
		WITH s
		RETURN s.trigger_action`, map[string]interface{}{"id": nodeId})

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
	session, err := client.Session(neo4j.AccessModeRead)
	if err != nil {
		return false, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return false, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (s:AgentDiagnosticLogs) -[:SCHEDULEDLOGS]-> (n{node_id:$id})
		WHERE (n:`+controls.ResourceTypeToNeo4j(nodeType)+`)
		AND s.status = '`+utils.SCAN_STATUS_STARTING+`'
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
		return res, errors.New("Missing node_id")
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasAgentDiagnosticLogRequests(client, nodeId, nodeType, max_work); !has || err != nil {
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

	r, err := tx.Run(`MATCH (s:AgentDiagnosticLogs) -[:SCHEDULEDLOGS]-> (n{node_id:$id})
		WHERE (n:`+controls.ResourceTypeToNeo4j(nodeType)+`)
		AND s.status = '`+utils.SCAN_STATUS_STARTING+`'
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

	if len(res) != 0 {
		err = tx.Commit()
	}

	return res, err

}

func hasPendingAgentScans(client neo4j.Driver, nodeId string, max_work int) (bool, error) {
	session, err := client.Session(neo4j.AccessModeRead)
	if err != nil {
		return false, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return false, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (s) -[:SCHEDULED]-> (n:Node{node_id:$id})
		WHERE s.status = '`+utils.SCAN_STATUS_STARTING+`'
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

func ExtractStartingAgentScans(ctx context.Context, nodeId string, max_work int) ([]controls.Action, error) {
	res := []controls.Action{}
	if len(nodeId) == 0 {
		return res, errors.New("Missing node_id")
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasPendingAgentScans(client, nodeId, max_work); !has || err != nil {
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

	r, err := tx.Run(`MATCH (s) -[:SCHEDULED]-> (n:Node{node_id:$id})
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

	if len(res) != 0 {
		err = tx.Commit()
	}

	return res, err

}

func hasPendingAgentUpgrade(client neo4j.Driver, nodeId string, max_work int) (bool, error) {
	session, err := client.Session(neo4j.AccessModeRead)
	if err != nil {
		return false, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return false, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (s:AgentVersion) -[r:SCHEDULED]-> (n:Node{node_id:$id})
		WHERE r.status = '`+utils.SCAN_STATUS_STARTING+`'
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
		return res, errors.New("Missing node_id")
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasPendingAgentUpgrade(client, nodeId, max_work); !has || err != nil {
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

	r, err := tx.Run(`MATCH (s:AgentVersion) -[r:SCHEDULED]-> (n:Node{node_id:$id})
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

	if len(res) != 0 {
		err = tx.Commit()
	}

	return res, err

}
