package controls

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func GetAgentActions(ctx context.Context, nodeId string) ([]controls.Action, error) {
	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return nil, err
	}

	session, err := client.Session(neo4j.AccessModeWrite)
	if err != nil {
		return nil, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return nil, err
	}
	defer tx.Close()

	r, err := tx.Run("match (n:Node{node_id:$id}) RETURN n.actions", map[string]interface{}{"id": nodeId})

	if err != nil {
		log.Error().Msgf("neo4j req err: %v", err)
		return nil, err
	}

	actions, err := r.Single()

	if err != nil {
		return nil, err
	}

	res := []controls.Action{}
	if actions.Values[0] != nil {
		for _, action := range actions.Values[0].([]interface{}) {
			entry := controls.Action{}
			err = json.Unmarshal([]byte(action.(string)), &entry)
			if err != nil {
				return res, err
			}
			res = append(res, entry)
		}
	}

	_, err = tx.Run("match (n:Node{node_id:$id}) SET n.actions = []", map[string]interface{}{"id": nodeId})

	return res, tx.Commit()
}

func SetAgentActions(ctx context.Context, nodeId string, actions []controls.Action) error {
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

	act_bytes := []string{}
	for _, act := range actions {
		bytes, err := json.Marshal(act)
		if err != nil {
			log.Error().Msgf("neo4j marshal err: %v", err)
			return err
		}
		act_bytes = append(act_bytes, string(bytes))
	}

	_, err = tx.Run("match (n:Node{node_id:$id}) UNWIND $data as act SET n.actions = coalesce(n.actions,[]) + act", map[string]interface{}{"id": nodeId, "data": act_bytes})

	if err != nil {
		return err
	}

	return tx.Commit()

}

func GetPendingAgentScans(ctx context.Context, nodeId string) ([]controls.Action, error) {
	res := []controls.Action{}
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

	r, err := tx.Run(`MATCH (s) -[:SCANNED]-> (n:Node{node_id:$id}) WHERE NOT (s.status = '`+utils.SCAN_STATUS_SUCCESS+`') AND s.retries < 3 SET s.retries = s.retries + 1 WITH s RETURN s.trigger_action`, map[string]interface{}{"id": nodeId})

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
