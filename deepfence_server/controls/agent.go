package controls

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func GetAgentActions(ctx context.Context, probeId string) ([]controls.Action, error) {
	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return nil, err
	}

	session, err := client.Session(neo4j.AccessModeRead)
	if err != nil {
		return nil, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return nil, err
	}
	defer tx.Close()

	r, err := tx.Run("match (n:Node{node_id:$id}) RETURN n.actions", map[string]interface{}{"id": probeId})

	if err != nil {
		log.Error().Msgf("neo4j req err: %v", err)
		return nil, err
	}

	actions, err := r.Single()

	if err != nil {
		return nil, err
	}

	res := []controls.Action{}
	for _, action := range actions.Values[0].([]string) {
		entry := controls.Action{}
		err = json.Unmarshal([]byte(action), &entry)
		if err != nil {
			return res, err
		}
		res = append(res, entry)
	}

	return res, err
}

func SetAgentActions(ctx context.Context, probeId string, actions []controls.Action) error {
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

	bytes, err := json.Marshal(actions)
	if err != nil {
		log.Error().Msgf("neo4j marshal err: %v", err)
	}

	_, err = tx.Run("match (n:Node{node_id:$id}) SET n.actions = coalesce(n.actions, []) + $data", map[string]interface{}{"id": probeId, "data": bytes})

	return err
}
