package cronjobs

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	diagnosticLogsCleanUpTimeout           = time.Hour * 6
	dbReportCleanUpTimeoutBase             = time.Minute * 2
	dbScanTimeoutBase                      = time.Minute * 5
	dbRegistryCleanUpTimeout               = time.Hour * 24
	dbUpgradeTimeout                       = time.Minute * 30
	defaultDBScannedResourceCleanUpTimeout = time.Hour * 24 * 30
	dbCloudResourceCleanupTimeout          = time.Hour * 13
)

var (
	resource_types  = [...]string{"aws_ec2_instance", "aws_ec2_application_load_balancer", "aws_ec2_classic_load_balancer", "aws_ec2_network_load_balancer"}
	resource_lambda = [...]string{"aws_lambda_function"}
	resource_ecs    = [...]string{"aws_ecs_service"}
)

func getResourceCleanUpTimeout(ctx context.Context) time.Duration {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return defaultDBScannedResourceCleanUpTimeout
	}
	timeoutSetting, err := model.GetSettingByKey(ctx, pgClient, model.InactiveNodesDeleteScanResultsKey)
	if err != nil {
		return defaultDBScannedResourceCleanUpTimeout
	}
	if t, ok := timeoutSetting.Value.Value.(int); ok {
		return time.Hour * 24 * time.Duration(t)
	}

	return defaultDBScannedResourceCleanUpTimeout
}

func getPushBackValue(session neo4j.Session) int32 {
	res, err := session.Run(`
		MATCH (n:Node{node_id:"`+ConsoleAgentId+`"})
		RETURN n.push_back`,
		map[string]interface{}{}, neo4j.WithTxTimeout(15*time.Second))
	if err != nil {
		return 1
	}
	rec, err := res.Single()
	if err != nil {
		return 1
	}
	return int32(rec.Values[0].(int64))
}

var cleanUpRunning = atomic.Bool{}

func CleanUpDB(msg *message.Message) error {
	topic := RecordOffsets(msg)
	defer SetTopicHandlerStatus(topic, false)

	if cleanUpRunning.Swap(true) {
		return nil
	}
	defer cleanUpRunning.Store(false)

	log.Info().Msgf("Clean up DB Starting")
	defer log.Info().Msgf("Clean up DB Done")
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	dbScannedResourceCleanUpTimeout := getResourceCleanUpTimeout(ctx)

	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	read_session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	pushBack := getPushBackValue(read_session)
	read_session.Close()

	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	dbReportCleanUpTimeout := dbReportCleanUpTimeoutBase * time.Duration(pushBack)
	dbScanTimeout := dbScanTimeoutBase * time.Duration(pushBack)

	txConfig := neo4j.WithTxTimeout(30 * time.Second)

	start := time.Now()

	// Set inactives
	if _, err = session.Run(`
		MATCH (n:Node)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND NOT n.node_id IN ["in-the-internet", "out-the-internet"]
		AND n.agent_running=true
		AND n.active = true
		WITH n LIMIT 10000
		SET n.active=false`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:Node)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND n.agent_running=false
		AND n.active = true
		WITH n LIMIT 10000
		SET n.active=false`,
		map[string]interface{}{"time_ms": dbCloudResourceCleanupTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	// registry images
	if _, err = session.Run(`
		MATCH (n:ContainerImage)
		WHERE exists((n)<-[:HOSTS]-(:RegistryAccount))
		AND n.updated_at < TIMESTAMP()-$time_ms
		AND n.active = true
		WITH n LIMIT 10000
		SET n.active=false`,
		map[string]interface{}{"time_ms": dbRegistryCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	// host images
	if _, err = session.Run(`
		MATCH (n:ContainerImage)
		WHERE exists((n)<-[:HOSTS]-(:Node))
		AND NOT exists((n)<-[:HOSTS]-(:RegistryAccount))
		AND n.updated_at < TIMESTAMP()-$time_ms
		AND n.active = true
		WITH n LIMIT 10000
		SET n.active=false`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeoutBase.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:ImageStub)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		OR NOT exists((n)<-[:IS]-(:ContainerImage))
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{"time_ms": dbRegistryCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:Container)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND n.active = true
		WITH n LIMIT 10000
		SET n.active=false`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:KubernetesCluster)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND n.active = true
		AND n.agent_running=true
		WITH n LIMIT 10000
		SET n.active=false`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:KubernetesCluster)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND n.active = true
		AND n.agent_running=false
		WITH n LIMIT 10000
		SET n.active=false`,
		map[string]interface{}{"time_ms": dbCloudResourceCleanupTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	// Delete old with no data
	if _, err = session.Run(`
		MATCH (n:Node)
		WHERE n.active = false
		AND NOT exists((n) <-[:SCANNED]-())
		OR n.updated_at < TIMESTAMP()-$old_time_ms
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{
			"time_ms":     dbReportCleanUpTimeout.Milliseconds(),
			"old_time_ms": dbScannedResourceCleanUpTimeout.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:ContainerImage)
		WHERE n.active = false
		AND (NOT exists((n) <-[:SCANNED]-())
		OR n.updated_at < TIMESTAMP()-$old_time_ms)
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{
			"old_time_ms": dbScannedResourceCleanUpTimeout.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:Container)
		WHERE n.active = false
		AND (NOT exists((n) <-[:SCANNED]-())
		OR n.updated_at < TIMESTAMP()-$old_time_ms)
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{
			"old_time_ms": dbScannedResourceCleanUpTimeout.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:KubernetesCluster)
		WHERE n.active = false
		AND (NOT exists((n) <-[:SCANNED]-())
		OR n.updated_at < TIMESTAMP()-$old_time_ms)
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{
			"old_time_ms": dbScannedResourceCleanUpTimeout.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:Pod)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:Process)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n) -[:SCANNED]-> ()
		WHERE n.retries >= 3
		WITH n LIMIT 10000
		SET n.status = $new_status`,
		map[string]interface{}{
			"time_ms":    dbScanTimeout.Milliseconds(),
			"new_status": utils.SCAN_STATUS_FAILED,
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (:AgentVersion) -[n:SCHEDULED]-> (:Node)
		WHERE n.retries >= 3
		WITH n LIMIT 10000
		SET n.status = $new_status`,
		map[string]interface{}{
			"time_ms":    dbUpgradeTimeout.Milliseconds(),
			"new_status": utils.SCAN_STATUS_FAILED,
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:AgentDiagnosticLogs)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		OR n.updated_at < TIMESTAMP()-$old_time_ms
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{
			"time_ms":     diagnosticLogsCleanUpTimeout.Milliseconds(),
			"old_time_ms": dbScannedResourceCleanUpTimeout.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:CloudNode)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND n.active = true
		WITH n LIMIT 10000
		SET n.active = false`,
		map[string]interface{}{
			"time_ms": dbScanTimeoutBase.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:CloudResource) <-[:HOSTS]- (cr:CloudRegion)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND NOT exists((n) <-[:SCANNED]-())
		OR n.updated_at < TIMESTAMP()-$old_time_ms
		WITH n, cr LIMIT 10000
		SET cr.cr_shown = CASE WHEN n.is_shown THEN cr.cr_shown - 1 ELSE cr.cr_shown END,
			cr.active = cr.cr_shown <> 0
		WITH n
		DETACH DELETE n`,
		map[string]interface{}{
			"time_ms":     dbCloudResourceCleanupTimeout.Milliseconds(),
			"old_time_ms": dbScannedResourceCleanUpTimeout.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:CloudProvider) -[:HOSTS]-> (m)
		WHERE m.active = true
		WITH count(m) as c, n LIMIT 10000
		SET n.active = c <> 0`,
		map[string]interface{}{}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:CloudRegion)
		WHERE not (n) -[:HOSTS]-> ()
		WITH n LIMIT 10000
		DELETE n`,
		map[string]interface{}{}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:CloudProvider)
		WHERE not (n) -[:HOSTS]-> ()
		WITH n LIMIT 10000
		DELETE n`,
		map[string]interface{}{}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}
	log.Debug().Msgf("clean up took: %v", time.Since(start))

	return nil
}

var linkCloudResourcesRunning = atomic.Bool{}

func LinkCloudResources(msg *message.Message) error {
	topic := RecordOffsets(msg)
	defer SetTopicHandlerStatus(topic, false)

	if linkCloudResourcesRunning.Swap(true) {
		return nil
	}
	defer linkCloudResourcesRunning.Store(false)

	log.Info().Msgf("Link CR Starting")
	defer log.Info().Msgf("Link CR Done")
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	txConfig := neo4j.WithTxTimeout(30 * time.Second)

	start := time.Now()

	if _, err = session.Run(`
		MATCH (n:CloudResource)
		WHERE not (n) <-[:HOSTS]- (:CloudRegion)
		AND NOT n.cloud_provider IS NULL
		AND NOT n.cloud_region IS NULL
		AND NOT n.account_id IS NULL
		WITH n LIMIT 50000
		MERGE (cp:CloudProvider{node_id: n.cloud_provider})
		MERGE (cr:CloudRegion{node_id: n.cloud_region})
		MERGE (m:CloudNode{node_id: n.account_id})
		MERGE (m) -[:OWNS]-> (n)
		MERGE (cp) -[:HOSTS]-> (cr)
		MERGE (cr) -[:HOSTS]-> (n)
		WITH cr, n
		WHERE n.is_shown = true
		WITH cr, count(n) as cnt
		SET cr.cr_shown = COALESCE(cr.cr_shown, 0) + cnt`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (cr:CloudRegion)
		WHERE NOT cr.cr_shown IS NULL
		SET cr.active = cr.cr_shown <> 0`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	// Handle AWS EC2 & LBs
	if _, err = session.Run(`
		MATCH (n:CloudResource)
		WHERE n.linked = false
		AND n.node_type in $types
		AND n.security_groups IS NOT NULL
		WITH n LIMIT 10000
		SET n.linked = true
		WITH n, apoc.convert.fromJsonList(n.security_groups) as groups
		UNWIND groups as subgroup
		WITH subgroup, CASE WHEN apoc.meta.type(subgroup) = "STRING" THEN subgroup ELSE subgroup.GroupName END as name,
		CASE WHEN apoc.meta.type(subgroup) = "STRING" THEN subgroup ELSE subgroup.GroupId END as node_id
		MERGE (m:SecurityGroup{node_id:node_id})
		MERGE (m)-[:SECURED]->(n)`,
		map[string]interface{}{
			"types": resource_types[:],
		}, txConfig); err != nil {
		return err
	}

	// Handle AWS Lambda
	if _, err = session.Run(`
		MATCH (n:CloudResource)
		WHERE n.linked = false
		AND n.node_type in $types
		WITH n LIMIT 10000
		SET n.linked = true
		WITH n, apoc.convert.fromJsonList(n.vpc_security_group_ids) as sec_group_ids
		UNWIND sec_group_ids as subgroup
		MERGE (m:SecurityGroup{node_id:subgroup})
		MERGE (m)-[:SECURED]->(n)`,
		map[string]interface{}{
			"types": resource_lambda[:],
		}, txConfig); err != nil {
		return err
	}

	// Handle AWS ECS
	if _, err = session.Run(`
		MATCH (n:CloudResource)
		WHERE n.linked = false
		AND n.node_type in $types
		WITH n LIMIT 10000
		SET n.linked = true
		WITH n, apoc.convert.fromJsonMap(n.network_configuration) as map
		UNWIND map.AwsvpcConfiguration.SecurityGroups as secgroup
		MERGE (m:SecurityGroup{node_id:secgroup})
		MERGE (m)-[:SECURED]->(n)`,
		map[string]interface{}{
			"types": resource_ecs[:],
		}, txConfig); err != nil {
		return err
	}

	log.Debug().Msgf("Link task took: %v", time.Since(start))

	return nil
}

var linkNodesRunning = atomic.Bool{}

func LinkNodes(msg *message.Message) error {
	topic := RecordOffsets(msg)
	defer SetTopicHandlerStatus(topic, false)

	if linkNodesRunning.Swap(true) {
		return nil
	}
	defer linkNodesRunning.Store(false)

	log.Info().Msgf("Link Nodes Starting")
	defer log.Info().Msgf("Link Nodes Done")
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	txConfig := neo4j.WithTxTimeout(30 * time.Second)

	start := time.Now()

	if _, err = session.Run(`
		MATCH (n:Node)
		WHERE not (n) <-[:HOSTS]- (:CloudRegion)
		AND NOT n.cloud_provider IS NULL
		AND NOT n.cloud_region IS NULL
		AND NOT n.node_id IN ["in-the-internet", "out-the-internet", "`+ConsoleAgentId+`"]
		WITH n LIMIT 50000
		MERGE (cp:CloudProvider{node_id: n.cloud_provider})
		MERGE (cr:CloudRegion{node_id: n.cloud_region})
		MERGE (cp) -[:HOSTS]-> (cr)
		MERGE (cr) -[:HOSTS]-> (n)
		SET cp.active = true, cr.active = true, cp.pseudo = false`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	if _, err := session.Run(`
		MATCH (n:Node) <-[:INSTANCIATE]- (k:KubernetesCluster)
		WHERE not (k) <-[:HOSTS]- (:CloudRegion)
		AND NOT n.cloud_region IS NULL
		MERGE (cr:CloudRegion{node_id:n.cloud_region})
		SET cr.active = true`,
		map[string]interface{}{}); err != nil {
		return err
	}

	if _, err := session.Run(`
		MATCH (n:KubernetesCluster)
		WHERE not (n) <-[:HOSTS]- (:CloudProvider)
		AND NOT n.cloud_provider IS NULL
		MERGE (cp:CloudProvider{node_id:n.cloud_provider})
		MERGE (cp) -[:HOSTS]-> (n)
		SET cp.active = true, cp.pseudo = false`,
		map[string]interface{}{}); err != nil {
		return err
	}

	log.Debug().Msgf("Link Nodes task took: %v", time.Since(start))

	return nil
}

func RetryScansDB(msg *message.Message) error {
	topic := RecordOffsets(msg)
	defer SetTopicHandlerStatus(topic, false)

	log.Info().Msgf("Retry scan DB Starting")
	defer log.Info().Msgf("Retry scan DB Done")
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(15 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	pushBack := getPushBackValue(session)
	dbScanTimeout := dbScanTimeoutBase * time.Duration(pushBack)

	if _, err = tx.Run(`
		MATCH (n) -[:SCANNED]-> ()
		WHERE n.status = $old_status
		AND n.updated_at < TIMESTAMP()-$time_ms
		AND n.retries < 3
		WITH n LIMIT 10000
		SET n.retries = n.retries + 1, n.status=$new_status`,
		map[string]interface{}{
			"time_ms":    dbScanTimeout.Milliseconds(),
			"old_status": utils.SCAN_STATUS_INPROGRESS,
			"new_status": utils.SCAN_STATUS_STARTING,
		}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (a:AgentDiagnosticLogs) -[:SCHEDULEDLOGS]-> (n)
		WHERE a.status = $old_status
		AND a.updated_at < TIMESTAMP()-$time_ms
		AND a.retries < 3
		WITH a LIMIT 10000
		SET a.retries = a.retries + 1, a.status=$new_status`,
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
	topic := RecordOffsets(msg)
	defer SetTopicHandlerStatus(topic, false)

	log.Info().Msgf("Retry upgrade DB Starting")
	defer log.Info().Msgf("Retry upgrade DB Done")
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(15 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	pushBack := getPushBackValue(session)
	dbScanTimeout := dbScanTimeoutBase * time.Duration(pushBack)

	if _, err = tx.Run(`
		MATCH (:AgentVersion) -[n:SCHEDULED]-> (:Node)
		WHERE n.status = $old_status
		AND n.updated_at < TIMESTAMP()-$time_ms
		AND n.retries < 3
		WITH n LIMIT 10000
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

	session.Run("CREATE CONSTRAINT ON (n:CloudProvider) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:CloudRegion) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:AgentVersion) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:KubernetesCluster) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:ContainerImage) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:ImageStub) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Node) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Container) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Pod) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Process) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Secret) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:SecretRule) ASSERT n.rule_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Malware) ASSERT n.malware_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:MalwareRule) ASSERT n.rule_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Vulnerability) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:VulnerabilityStub) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:SecurityGroup) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:CloudNode) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:CloudResource) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:RegistryAccount) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Compliance) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:ComplianceRule) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:CloudCompliance) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:AgentDiagnosticLogs) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:CloudComplianceExecutable) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:CloudComplianceControl) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:CloudComplianceBenchmark) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_SECRET_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_VULNERABILITY_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_COMPLIANCE_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_CLOUD_COMPLIANCE_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_MALWARE_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_SECRET_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_VULNERABILITY_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_COMPLIANCE_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_CLOUD_COMPLIANCE_SCAN), map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4J_MALWARE_SCAN), map[string]interface{}{})

	session.Run("MERGE (n:Node{node_id:'in-the-internet'}) SET n.node_name='The Internet (Inbound)', n.pseudo=true, n.cloud_provider='internet', n.cloud_region='internet', n.depth=0, n.active=true", map[string]interface{}{})
	session.Run("MERGE (n:Node{node_id:'out-the-internet'}) SET n.node_name='The Internet (Outbound)', n.pseudo=true, n.cloud_provider='internet', n.cloud_region='internet', n.depth=0, n.active=true", map[string]interface{}{})
	session.Run("MERGE (n:Node{node_id:'"+ConsoleAgentId+"'}) SET n.node_name='Console', n.pseudo=true, n.cloud_provider='internet', n.cloud_region='internet', n.depth=0, n.push_back=COALESCE(n.push_back,1)", map[string]interface{}{})

	// Indexes for fast searching & ordering
	addIndexOnIssuesCount(session, "ContainerImage")
	addIndexOnIssuesCount(session, "Container")

	session.Run("CREATE INDEX NodeDepth IF NOT EXISTS FOR (n:Node) ON (n.depth)", map[string]interface{}{})
	session.Run("CREATE INDEX CloudResourceDepth IF NOT EXISTS FOR (n:CloudResource) ON (n.depth)", map[string]interface{}{})
	session.Run("CREATE INDEX CloudResourceLinked IF NOT EXISTS FOR (n:CloudResource) ON (n.linked)", map[string]interface{}{})

	return nil
}

func addIndexOnIssuesCount(session neo4j.Session, node_type string) {
	session.Run(fmt.Sprintf("CREATE INDEX %sOrderByVulnerabilitiesCount IF NOT EXISTS FOR (n:%s) ON (n.vulnerabilities_count)",
		node_type, node_type),
		map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE INDEX %sOrderBySecretsCount IF NOT EXISTS FOR (n:%s) ON (n.vulnerabilities_count)",
		node_type, node_type),
		map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE INDEX %sOrderByMalwaresCount IF NOT EXISTS FOR (n:%s) ON (n.secrets_count)",
		node_type, node_type),
		map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE INDEX %sOrderByCompliancesCount IF NOT EXISTS FOR (n:%s) ON (n.compliances_count)",
		node_type, node_type),
		map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE INDEX %sOrderByCloudCompliancesCount IF NOT EXISTS FOR (n:%s) ON (n.cloud_compliances_count)",
		node_type, node_type),
		map[string]interface{}{})
}
