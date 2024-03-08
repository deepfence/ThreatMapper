package cronjobs

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/hibiken/asynq"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const (
	contentTypeJson = "application/json"
)

func UpdateLicenseStatus(ctx context.Context, task *asynq.Task) error {

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}
	license, err := model.GetLicense(ctx, pgClient)
	if errors.Is(err, sql.ErrNoRows) {
		// License not registered yet
		return nil
	} else if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	license.CurrentHosts, err = getCurrentActiveAgents(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	err = license.Save(ctx, pgClient)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	return nil
}

func getCurrentActiveAgents(ctx context.Context) (int64, error) {
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return 0, err
	}
	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(15*time.Second))
	if err != nil {
		return 0, err
	}
	defer tx.Close(ctx)

	res, err := tx.Run(ctx, `MATCH (n:Node)
			WHERE n.pseudo = false AND n.active = true AND n.agent_running = true
			return count(n)`,
		map[string]interface{}{})
	if err != nil {
		return 0, err
	}
	rec, err := res.Single(ctx)
	if err != nil {
		return 0, err
	}

	var activeAgentNodes int64
	if rec.Values[0] != nil {
		activeAgentNodes = rec.Values[0].(int64)
	}
	return activeAgentNodes, nil
}
