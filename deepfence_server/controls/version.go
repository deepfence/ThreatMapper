package controls

import (
	"context"
	"encoding/json"

	"github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	DEFAULT_AGENT_IMAGE_NAME = "deepfence.io"
	DEFAULT_AGENT_IMAGE_TAG  = "thomas"
	DEFAULT_AGENT_VERSION    = "0.0.1"
)

func ScheduleAgentUpgrade(ctx context.Context, version string, nodeIds []string, action controls.Action) error {

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session, err := client.Session(neo4j.AccessModeWrite)
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
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
		MERGE (v) -[:SCHEDULED{status: $status, retries: 0, trigger_action: $action}]-> (n)`,
		map[string]interface{}{
			"version":  version,
			"node_ids": nodeIds,
			"status":   utils.SCAN_STATUS_STARTING,
			"action":   string(action_str),
		})

	if err != nil {
		return err
	}

	return tx.Commit()

}
