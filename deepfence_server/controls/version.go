package controls

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"golang.org/x/mod/semver"
)

const (
	DEFAULT_AGENT_IMAGE_NAME = "deepfence.io"
	DEFAULT_AGENT_IMAGE_TAG  = "thomas"
	DEFAULT_AGENT_VERSION    = "0.0.1"
)

func PrepareAgentUpgradeAction(ctx context.Context, version string) (ctl.Action, error) {

	url, err := GetAgentVersionTarball(ctx, version)
	if err != nil {
		return ctl.Action{}, err
	}

	internal_req := ctl.StartAgentUpgradeRequest{
		HomeDirectoryURL: url,
		Version:          version,
	}

	b, err := json.Marshal(internal_req)
	if err != nil {
		return ctl.Action{}, err
	}

	return ctl.Action{
		ID:             ctl.StartAgentUpgrade,
		RequestPayload: string(b),
	}, nil
}

func ScheduleAgentUpgrade(ctx context.Context, version string, nodeIds []string, action controls.Action) error {

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	action_str, err := json.Marshal(action)
	if err != nil {
		return err
	}

	_, err = tx.Run(`
		MATCH (v:AgentVersion{node_id: $version})
		MATCH (n:Node)
		WHERE n.node_id IN $node_ids
		MERGE (v) -[:SCHEDULED{status: $status, retries: 0, trigger_action: $action, updated_at: TIMESTAMP()}]-> (n)`,
		map[string]interface{}{
			"version":  version,
			"node_ids": nodeIds,
			"status":   utils.ScanStatusStarting,
			"action":   string(action_str),
		})

	if err != nil {
		return err
	}

	return tx.Commit()

}

func GetAgentVersionTarball(ctx context.Context, version string) (string, error) {

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return "", err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return "", err
	}
	defer tx.Close()

	res, err := tx.Run(`
		MATCH (v:AgentVersion{node_id: $version})
		RETURN v.url`,
		map[string]interface{}{
			"version": version,
		})

	if err != nil {
		return "", err
	}

	r, err := res.Single()

	if err != nil {
		return "", err
	}

	return r.Values[0].(string), nil
}

func GetAgentPluginVersionTarball(ctx context.Context, version, plugin_name string) (string, error) {

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return "", err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return "", err
	}
	defer tx.Close()

	query := fmt.Sprintf(`
		MATCH (v:AgentVersion{node_id: $version})
		return v.url_%s`, plugin_name)
	res, err := tx.Run(query,
		map[string]interface{}{
			"version": version,
		})

	if err != nil {
		return "", err
	}

	r, err := res.Single()

	if err != nil {
		return "", err
	}

	return r.Values[0].(string), nil
}

func hasPendingUpgradeOrNew(ctx context.Context, version string, nodeId string) (bool, error) {

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return false, err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return false, err
	}
	defer tx.Close()

	res, err := tx.Run(`
		MATCH (n:Node{node_id:$node_id})
		MATCH (v:AgentVersion{node_id:$version})
		OPTIONAL MATCH (v) -[rs:SCHEDULED]-> (n)
		OPTIONAL MATCH (n) -[rv:VERSIONED]-> (v)
		RETURN rs IS NOT NULL OR rv IS NULL`,
		map[string]interface{}{
			"node_id": nodeId,
			"version": version,
		})
	if err != nil {
		return false, err
	}

	r, err := res.Single()
	if err != nil {
		// No results means new
		return true, nil
	}
	return r.Values[0].(bool), nil
}

func wasAttachedToNewer(ctx context.Context, version string, nodeId string) (bool, string, error) {
	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return false, "", err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return false, "", err
	}
	defer tx.Close()

	res, err := tx.Run(`
		MATCH (n:Node{node_id:$node_id}) -[old:VERSIONED]-> (v)
		RETURN v.node_id`,
		map[string]interface{}{
			"node_id": nodeId,
		})
	if err != nil {
		return false, "", err
	}

	rec, err := res.Single()
	if err != nil {
		return false, "", nil
	}

	prev_ver := rec.Values[0].(string)

	return semver.Compare(prev_ver, version) == 1, prev_ver, nil
}

func CompleteAgentUpgrade(ctx context.Context, version string, nodeId string) error {

	has, err := hasPendingUpgradeOrNew(ctx, version, nodeId)

	if err != nil {
		return err
	}

	if !has {
		return nil
	}

	newer, prev_ver, err := wasAttachedToNewer(ctx, version, nodeId)
	if err != nil {
		return err
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	_, err = tx.Run(`
		OPTIONAL MATCH (n:Node{node_id:$node_id}) -[old:VERSIONED]-> (v)
		DELETE old`,
		map[string]interface{}{
			"node_id": nodeId,
		})
	if err != nil {
		return err
	}

	_, err = tx.Run(`
		MERGE (n:Node{node_id:$node_id})
		MERGE (v:AgentVersion{node_id:$version})
		MERGE (n) -[r:VERSIONED]-> (v)
		WITH n, v
		OPTIONAL MATCH (v) -[r:SCHEDULED]-> (n)
		DELETE r`,
		map[string]interface{}{
			"version": version,
			"node_id": nodeId,
		})

	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	// If attached to newer, schedule an ugprade
	if newer {
		action, err := PrepareAgentUpgradeAction(ctx, prev_ver)
		if err != nil {
			return err
		}
		err = ScheduleAgentUpgrade(ctx, prev_ver, []string{nodeId}, action)
		if err != nil {
			return err
		}
	}

	return nil
}

func ScheduleAgentPluginEnable(ctx context.Context, version, plugin_name string, nodeIds []string, action controls.Action) error {

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	action_str, err := json.Marshal(action)
	if err != nil {
		return err
	}

	query := fmt.Sprintf(`
		MATCH (v:%sVersion{node_id: $version})
		MATCH (n:Node)
		WHERE n.node_id IN $nonternal_req := ctl.EnableAgentPluginRequest{
		BinUrl:     url,
		Version:    agentUp.Version,
		PluginName: agentUp.PluginName,
		}
		de_ids
		MERGE (v) -[:SCHEDULED{status: $status, retries: 0, trigger_action: $action, updated_at: TIMESTAMP()}]-> (n)`, plugin_name)

	_, err = tx.Run(query,
		map[string]interface{}{
			"version":  version,
			"node_ids": nodeIds,
			"status":   utils.ScanStatusStarting,
			"action":   string(action_str),
		})

	if err != nil {
		return err
	}

	return tx.Commit()

}

func ScheduleAgentPluginDisable(ctx context.Context, plugin_name string, nodeIds []string, action controls.Action) error {

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	action_str, err := json.Marshal(action)
	if err != nil {
		return err
	}

	query := fmt.Sprintf(`
		MATCH (n:Node) -[:USES]-> (v:%sVersion)
		WHERE n.node_id IN $node_ids
		MERGE (v) -[:SCHEDULED{status: $status, retries: 0, trigger_action: $action, updated_at: TIMESTAMP()}]-> (n)
		SET n.status_%s = 'disabling'`, plugin_name, plugin_name)

	_, err = tx.Run(query,
		map[string]interface{}{
			"node_ids": nodeIds,
			"status":   utils.ScanStatusStarting,
			"action":   string(action_str),
		})

	if err != nil {
		return err
	}

	return tx.Commit()

}
