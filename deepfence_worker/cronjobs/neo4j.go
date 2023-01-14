package cronjobs

import (
	"github.com/ThreeDotsLabs/watermill/message"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	dbCleanUpTimeout = time.Minute * 2
	dbScanTimeout    = time.Minute * 2
)

func CleanUpDB(msg *message.Message) error {
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run("MATCH (n:Node) WHERE n.updated_at < TIMESTAMP()-$time_ms SET n.agent_running=false", map[string]interface{}{"time_ms": dbCleanUpTimeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Container) WHERE n.updated_at < TIMESTAMP()-$time_ms DETACH DELETE n", map[string]interface{}{"time_ms": dbCleanUpTimeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Pod) WHERE n.updated_at < TIMESTAMP()-$time_ms DETACH DELETE n", map[string]interface{}{"time_ms": dbCleanUpTimeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Process) WHERE n.updated_at < TIMESTAMP()-$time_ms DETACH DELETE n", map[string]interface{}{"time_ms": dbCleanUpTimeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n) -[:SCANNED]-> (:Node) WHERE n.status = $old_status AND n.updated_at < TIMESTAMP()-$time_ms AND n.retries >= 3 SET n.status = $new_status", map[string]interface{}{"time_ms": dbScanTimeout.Milliseconds(), "old_status": utils.SCAN_STATUS_INPROGRESS, "new_status": utils.SCAN_STATUS_FAILED}); err != nil {
		return err
	}

	return tx.Commit()
}

func RetryScansDB(msg *message.Message) error {
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run("MATCH (n) -[:SCANNED]-> (:Node) WHERE n.status = $old_status AND n.updated_at < TIMESTAMP()-$time_ms AND n.retries < 3 SET n.retries = n.retries + 1, n.status=$new_status", map[string]interface{}{"time_ms": dbScanTimeout.Milliseconds(), "old_status": utils.SCAN_STATUS_INPROGRESS, "new_status": utils.SCAN_STATUS_STARTING}); err != nil {
		return err
	}

	return tx.Commit()
}
