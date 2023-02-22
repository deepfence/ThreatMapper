package cronjobs

import (
	"fmt"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	dbCleanUpTimeout = time.Minute * 2
	dbScanTimeout    = time.Minute * 2
	dbUpgradeTimeout = time.Minute * 5
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

	if _, err = tx.Run(`
		MATCH (n) -[:SCANNED]-> (:Node)
		WHERE n.retries >= 3
		SET n.status = $new_status`,
		map[string]interface{}{
			"time_ms":    dbScanTimeout.Milliseconds(),
			"new_status": utils.SCAN_STATUS_FAILED,
		}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (:AgentVersion) -[n:SCHEDULED]-> (:Node)
		WHERE n.retries >= 3
		SET n.status = $new_status`,
		map[string]interface{}{
			"time_ms":    dbUpgradeTimeout.Milliseconds(),
			"new_status": utils.SCAN_STATUS_FAILED,
		}); err != nil {
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

	if _, err = tx.Run(`
		MATCH (n) -[:SCANNED]-> (:Node)
		WHERE n.status = $old_status
		AND n.updated_at < TIMESTAMP()-$time_ms
		AND n.retries < 3
		SET n.retries = n.retries + 1, n.status=$new_status`,
		map[string]interface{}{
			"time_ms":    dbScanTimeout.Milliseconds(),
			"old_status": utils.SCAN_STATUS_INPROGRESS,
			"new_status": utils.SCAN_STATUS_STARTING,
		}); err != nil {
		return err
	}

	return tx.Commit()
}

func RetryUpgradeAgent(msg *message.Message) error {
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

	if _, err = tx.Run(`
		MATCH (:AgentVersion) -[n:SCHEDULED]-> (:Node)
		WHERE n.status = $old_status
		AND n.updated_at < TIMESTAMP()-$time_ms
		AND n.retries < 3
		SET n.retries = n.retries + 1, n.status=$new_status`,
		map[string]interface{}{
			"time_ms":    dbScanTimeout.Milliseconds(),
			"old_status": utils.SCAN_STATUS_INPROGRESS,
			"new_status": utils.SCAN_STATUS_STARTING,
		}); err != nil {
		return err
	}

	return tx.Commit()
}

func ApplyGraphDBStartup(msg *message.Message) error {
	log.Info().Msgf("DB Startup")
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	session.Run("CREATE CONSTRAINT ON (n:AgentVersion) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:KubernetesCluster) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:ContainerImage) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Node) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Container) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Pod) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Process) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:KCluster) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Secret) ASSERT n.rule_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Malware) ASSERT n.malware_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Vulnerability) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:SecurityGroup) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:CloudResource) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:RegistryAccount) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Compliance) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:CloudCompliance) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_SECRET_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_VULNERABILITY_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_COMPLIANCE_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_MALWARE_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_SECRET_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_VULNERABILITY_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_COMPLIANCE_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_MALWARE_SCAN), map[string]interface{}{})

	session.Run("MERGE (n:Node{node_id:'in-the-internet', cloud_provider:'internet', cloud_region: 'internet', depth: 0})", map[string]interface{}{})
	session.Run("MERGE (n:Node{node_id:'out-the-internet', cloud_provider:'internet', cloud_region: 'internet', depth: 0})", map[string]interface{}{})
	session.Run("MERGE (n:Node{node_id:'deepfence-console-cron', cloud_provider:'internet', cloud_region: 'internet', depth: 0})", map[string]interface{}{})

	return nil
}
