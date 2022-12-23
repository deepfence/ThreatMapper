package cronjobs

import (
	"context"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	db_clean_up_timeout = time.Minute * 2
)

func CleanUpDB(ctx context.Context) error {
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session, err := nc.Session(neo4j.AccessModeWrite)
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run("MATCH (n:Node) WHERE n.updated_at < TIMESTAMP()-$time_ms SET n.unactive=true", map[string]interface{}{"time_ms": db_clean_up_timeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Container) WHERE n.updated_at < TIMESTAMP()-$time_ms DETACH DELETE n", map[string]interface{}{"time_ms": db_clean_up_timeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Pod) WHERE n.updated_at < TIMESTAMP()-$time_ms DETACH DELETE n", map[string]interface{}{"time_ms": db_clean_up_timeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Process) WHERE n.updated_at < TIMESTAMP()-$time_ms DETACH DELETE n", map[string]interface{}{"time_ms": db_clean_up_timeout.Milliseconds()}); err != nil {
		return err
	}

	return tx.Commit()
}
