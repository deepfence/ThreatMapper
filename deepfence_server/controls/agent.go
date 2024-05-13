package controls

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/threatintel"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/jellydator/ttlcache/v3"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const (
	maxWork = 5
)

var (
	ErrMissingNodeID = errors.New("missing node_id")
)

func GetAgentActions(ctx context.Context, nodeID string, workNumToExtract int, consoleURL string, ttlCache *ttlcache.Cache[string, string]) ([]controls.Action, []error) {

	ctx, span := telemetry.NewSpan(ctx, "control", "get-agent-actions")
	defer span.End()

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
	diagnosticLogActions, diagnosticLogErr := ExtractAgentDiagnosticLogRequests(ctx, nodeID, controls.Host, maxWork, consoleURL)
	if diagnosticLogErr == nil {
		actions = append(actions, diagnosticLogActions...)
	}

	if workNumToExtract == 0 {
		return actions, []error{stopActionsErr, diagnosticLogErr}
	}

	upgradeActions, upgradeErr := ExtractPendingAgentUpgrade(ctx, nodeID, workNumToExtract, consoleURL, ttlCache)
	workNumToExtract -= len(upgradeActions)
	if upgradeErr == nil {
		actions = append(actions, upgradeActions...)
	}

	scanActions, scanErr := ExtractStartingAgentScans(ctx, nodeID, workNumToExtract)
	workNumToExtract -= len(scanActions)
	if scanErr == nil {
		actions = append(actions, scanActions...)
	}

	threatintelActions, threatintelLogErr := ExtractPendingAgentThreatIntelTask(ctx, nodeID, consoleURL, ttlCache)
	workNumToExtract -= len(threatintelActions)
	if threatintelLogErr == nil {
		actions = append(actions, threatintelActions...)
	}

	return actions, []error{scanErr, upgradeErr, diagnosticLogErr, stopActionsErr, threatintelLogErr}
}

func GetPendingAgentScans(ctx context.Context, nodeID string, availableWorkload int, ttlCache *ttlcache.Cache[string, string]) ([]controls.Action, error) {

	ctx, span := telemetry.NewSpan(ctx, "control", "get-pending-agent-scans")
	defer span.End()

	res := []controls.Action{}
	if len(nodeID) == 0 {
		return res, ErrMissingNodeID
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasPendingAgentScans(ctx, client, nodeID, availableWorkload); !has || err != nil {
		return res, err
	}

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	r, err := tx.Run(ctx, `
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

	records, err := r.Collect(ctx)

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
		err = tx.Commit(ctx)
	}

	return res, err

}

func hasAgentDiagnosticLogRequests(ctx context.Context, client neo4j.DriverWithContext, nodeID string, nodeType controls.ScanResource, maxWork int) (bool, error) {

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return false, err
	}
	defer tx.Close(ctx)

	r, err := tx.Run(ctx, `MATCH (s:AgentDiagnosticLogs) -[:SCHEDULEDLOGS]-> (n{node_id:$id})
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

	records, err := r.Collect(ctx)
	return len(records) != 0, err
}

func ExtractAgentDiagnosticLogRequests(ctx context.Context, nodeID string, nodeType controls.ScanResource, maxWork int, consoleURL string) ([]controls.Action, error) {
	res := []controls.Action{}
	if len(nodeID) == 0 {
		return res, ErrMissingNodeID
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasAgentDiagnosticLogRequests(ctx, client, nodeID, nodeType, maxWork); !has || err != nil {
		return res, err
	}

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	r, err := tx.Run(ctx, `MATCH (s:AgentDiagnosticLogs) -[:SCHEDULEDLOGS]-> (n{node_id:$id})
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
	records, err := r.Collect(ctx)
	if err != nil {
		return res, err
	}

	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		return res, err
	}

	for _, record := range records {
		var action controls.Action
		if record.Values[0] == nil {
			log.Error().Msgf("Invalid neo4j trigger_action result, skipping")
			continue
		}
		err = json.Unmarshal([]byte(record.Values[0].(string)), &action)
		if err != nil {
			log.Error().Msgf("Unmarshal of action failed: %v", err)
			continue
		}

		var sendAgentDiagnosticLogsRequest controls.SendAgentDiagnosticLogsRequest
		err = json.Unmarshal([]byte(action.RequestPayload), &sendAgentDiagnosticLogsRequest)
		if err != nil {
			log.Error().Msgf("Unmarshal of action failed: %v", err)
			continue
		}

		uploadURL, err := mc.CreatePublicUploadURL(ctx, sendAgentDiagnosticLogsRequest.UploadURL, true, time.Minute*10, url.Values{}, consoleURL)
		if err != nil {
			log.Error().Msgf("Cannot create public upload URL: %v", err)
			continue
		}
		sendAgentDiagnosticLogsRequest.UploadURL = uploadURL
		requestPayload, err := json.Marshal(sendAgentDiagnosticLogsRequest)
		if err != nil {
			log.Error().Msgf("Cannot marshal sendAgentDiagnosticLogsRequest: %v", err)
			continue
		}
		action.RequestPayload = string(requestPayload)

		res = append(res, action)
	}

	if len(res) != 0 {
		err = tx.Commit(ctx)
	}

	return res, err

}

func hasPendingAgentScans(ctx context.Context, client neo4j.DriverWithContext, nodeID string, maxWork int) (bool, error) {
	ctx, span := telemetry.NewSpan(ctx, "control", "has-pending-agent-scans")
	defer span.End()

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return false, err
	}
	defer tx.Close(ctx)

	r, err := tx.Run(ctx, `MATCH (s) -[:SCHEDULED]-> (n:Node{node_id:$id})
		WHERE s.status = '`+utils.ScanStatusStarting+`'
		AND s.retries < 3
		WITH s LIMIT $max_work
		RETURN s.trigger_action`,
		map[string]interface{}{"id": nodeID, "max_work": maxWork})

	if err != nil {
		return false, err
	}

	records, err := r.Collect(ctx)
	return len(records) != 0, err
}

func ExtractStartingAgentScans(ctx context.Context, nodeID string, maxWork int) ([]controls.Action, error) {

	ctx, span := telemetry.NewSpan(ctx, "control", "extract-starting-agent-scans")
	defer span.End()

	res := []controls.Action{}
	if len(nodeID) == 0 {
		return res, ErrMissingNodeID
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasPendingAgentScans(ctx, client, nodeID, maxWork); !has || err != nil {
		return res, err
	}

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	r, err := tx.Run(ctx, `MATCH (s) -[:SCHEDULED]-> (n:Node{node_id:$id})
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

	records, err := r.Collect(ctx)

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
		err = tx.Commit(ctx)
	}

	return res, err

}

func ExtractStoppingAgentScans(ctx context.Context, nodeID string, maxWrok int) ([]controls.Action, error) {

	ctx, span := telemetry.NewSpan(ctx, "control", "extract-stopping-agent-scans")
	defer span.End()

	res := []controls.Action{}
	if len(nodeID) == 0 {
		return res, ErrMissingNodeID
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	r, err := tx.Run(ctx, `MATCH (s) -[:SCHEDULED]-> (n:Node{node_id:$id})
		WHERE s.status = '`+utils.ScanStatusCancelPending+`'
		WITH s LIMIT $max_work
        SET s.status = '`+utils.ScanStatusCancelling+`', s.updated_at = TIMESTAMP()
		WITH s
		RETURN s.trigger_action`,
		map[string]interface{}{"id": nodeID, "max_work": maxWrok})

	if err != nil {
		return res, err
	}

	records, err := r.Collect(ctx)

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
		err = tx.Commit(ctx)
	}

	return res, err

}

func ExtractPendingAgentThreatIntelTask(ctx context.Context, nodeID string, consoleURL string, ttlCache *ttlcache.Cache[string, string]) ([]controls.Action, error) {
	res := []controls.Action{}
	if len(nodeID) == 0 {
		return res, ErrMissingNodeID
	}

	var (
		req controls.ThreatIntelInfo
		err error
	)

	req.MalwareRulesURL, req.MalwareRulesHash, err = threatintel.FetchMalwareRulesURL(ctx, consoleURL, ttlCache)
	if err != nil {
		return res, err
	}

	req.SecretsRulesURL, req.SecretsRulesHash, err = threatintel.FetchSecretsRulesURL(ctx, consoleURL, ttlCache)
	if err != nil {
		return res, err
	}

	payload, err := json.Marshal(req)
	if err != nil {
		return res, err
	}

	res = append(res, controls.Action{
		ID:             controls.UpdateAgentThreatIntel,
		RequestPayload: string(payload),
	})

	return res, err
}

func hasPendingAgentUpgrade(ctx context.Context, client neo4j.DriverWithContext, nodeID string, maxWork int) (bool, error) {

	ctx, span := telemetry.NewSpan(ctx, "control", "has-pending-agent-upgrade")
	defer span.End()

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return false, err
	}
	defer tx.Close(ctx)

	r, err := tx.Run(ctx, `MATCH (s:AgentVersion) -[r:SCHEDULED]-> (n:Node{node_id:$id})
		WHERE r.status = '`+utils.ScanStatusStarting+`'
		AND r.retries < 3
		WITH r LIMIT $max_work
		RETURN r.trigger_action`,
		map[string]interface{}{"id": nodeID, "max_work": maxWork})

	if err != nil {
		return false, err
	}

	records, err := r.Collect(ctx)
	return len(records) != 0, err
}

func ExtractPendingAgentUpgrade(ctx context.Context, nodeID string, maxWork int, consoleURL string, ttlCache *ttlcache.Cache[string, string]) ([]controls.Action, error) {

	ctx, span := telemetry.NewSpan(ctx, "control", "extract-pending-agent-upgrade")
	defer span.End()

	res := []controls.Action{}
	if len(nodeID) == 0 {
		return res, ErrMissingNodeID
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	if has, err := hasPendingAgentUpgrade(ctx, client, nodeID, maxWork); !has || err != nil {
		return res, err
	}

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	r, err := tx.Run(ctx, `MATCH (s:AgentVersion) -[r:SCHEDULED]-> (n:Node{node_id:$id})
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

	records, err := r.Collect(ctx)
	if err != nil {
		return res, err
	}

	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		return res, err
	}

	for _, record := range records {
		var action controls.Action
		if record.Values[0] == nil {
			log.Error().Msgf("Invalid neo4j trigger_action result, skipping")
			continue
		}
		err = json.Unmarshal([]byte(record.Values[0].(string)), &action)
		if err != nil {
			log.Error().Msgf("Unmarshal of action failed: %v", err)
			continue
		}

		var startAgentUpgradeRequest controls.StartAgentUpgradeRequest
		err = json.Unmarshal([]byte(action.RequestPayload), &startAgentUpgradeRequest)
		if err != nil {
			log.Error().Msgf("Unmarshal of action failed: %v", err)
			continue
		}

		var exposedURL string
		cacheVal := ttlCache.Get(consoleURL + startAgentUpgradeRequest.HomeDirectoryURL)
		if cacheVal == nil {
			exposedURL, err = mc.CreatePublicUploadURL(ctx, startAgentUpgradeRequest.HomeDirectoryURL, false, time.Hour*4, url.Values{}, consoleURL)
			if err != nil {
				log.Error().Msgf("Cannot create public upload URL: %v", err)
				continue
			}
			ttlCache.Set(consoleURL+startAgentUpgradeRequest.HomeDirectoryURL, exposedURL, time.Hour*3)
		} else {
			exposedURL = cacheVal.Value()
		}

		startAgentUpgradeRequest.HomeDirectoryURL = exposedURL
		requestPayload, err := json.Marshal(startAgentUpgradeRequest)
		if err != nil {
			log.Error().Msgf("Cannot marshal startAgentUpgradeRequest: %v", err)
			continue
		}
		action.RequestPayload = string(requestPayload)

		res = append(res, action)
	}

	if len(res) != 0 {
		err = tx.Commit(ctx)
	}

	return res, err

}

func CheckNodeExist(ctx context.Context, nodeID string) error {

	ctx, span := telemetry.NewSpan(ctx, "control", "check-node-exist")
	defer span.End()

	if len(nodeID) == 0 {
		return ErrMissingNodeID
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	r, err := tx.Run(ctx, `
		MATCH (n:Node{node_id:$id})
		RETURN n.node_id`,
		map[string]interface{}{"id": nodeID})

	if err != nil {
		return err
	}

	_, err = r.Single(ctx)

	if err != nil {
		return ErrMissingNodeID
	}

	return nil
}
