package cronjobs

import (
	"context"
	"sync/atomic"
	"time"

	"github.com/hibiken/asynq"

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
	ecsTaskRunningStatus                   = "RUNNING"
	ecsTaskPublicEnabledConfig             = "ENABLED"
)

var (
	resource_types    = [...]string{"aws_ec2_instance", "aws_ec2_application_load_balancer", "aws_ec2_classic_load_balancer", "aws_ec2_network_load_balancer"}
	resource_lambda   = [...]string{"aws_lambda_function"}
	resource_ecs      = [...]string{"aws_ecs_service"}
	resource_ecs_task = [...]string{"aws_ecs_task"}
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

func CleanUpDB(ctx context.Context, task *asynq.Task) error {
	if cleanUpRunning.Swap(true) {
		return nil
	}
	defer cleanUpRunning.Store(false)

	log.Info().Msgf("Clean up DB Starting")
	defer log.Info().Msgf("Clean up DB Done")

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
		MATCH (n:Node) <-[:HOSTS]- (cr:CloudRegion)
		WHERE n.active = false
		AND NOT exists((n) <-[:SCANNED]-())
		OR n.updated_at < TIMESTAMP()-$old_time_ms
		WITH n, cr LIMIT 10000
		SET cr.cr_shown = CASE WHEN n.kubernetes_cluster_id= "" or n.kubernetes_cluster_id is null THEN cr.cr_shown - 1 ELSE cr.cr_shown END,
			cr.active = cr.cr_shown <> 0
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

func LinkCloudResources(ctx context.Context, task *asynq.Task) error {
	if linkCloudResourcesRunning.Swap(true) {
		return nil
	}
	defer linkCloudResourcesRunning.Store(false)

	log.Info().Msgf("Link CR Starting")
	defer log.Info().Msgf("Link CR Done")

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
		MATCH (n:Node) <-[:HOSTS]- (cr:CloudRegion)
		WHERE n.active = true and (n.kubernetes_cluster_id= "" or n.kubernetes_cluster_id is null)
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
		WITH n, subgroup, CASE WHEN apoc.meta.type(subgroup) = "STRING" THEN subgroup ELSE subgroup.GroupName END as name,
		CASE WHEN apoc.meta.type(subgroup) = "STRING" THEN subgroup ELSE subgroup.GroupId END as node_id
		OPTIONAL MATCH (m:CloudResource{id: "aws_vpc_security_group_rule", group_id: node_id})
		MATCH (o:Node {node_id:'out-the-internet'})
		MATCH (p:Node {node_id:'in-the-internet'})
		WITH m, n, o, p, CASE m WHEN NOT NULL THEN [1] ELSE [] END AS make_cat
		FOREACH (i IN make_cat |
			MERGE (m) -[:SECURED]-> (n)
		)
		WITH m, n, o, p, CASE WHEN m.is_egress AND m.cidr_ipv4 = "0.0.0.0/0" THEN [1] ELSE [] END AS make_cat2
		FOREACH (i IN make_cat2 |
			MERGE (n) <-[:PUBLIC]- (o)
		)
		WITH m, n, o, p, CASE WHEN NOT m.is_egress AND m.cidr_ipv4 = "0.0.0.0/0" THEN [1] ELSE [] END AS make_cat3
		FOREACH (i IN make_cat3 |
			MERGE (n) <-[:PUBLIC]- (p)
		)`,
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
		OPTIONAL MATCH (m:CloudResource{id: "aws_vpc_security_group_rule", group_id: subgroup})
		MATCH (o:Node {node_id:'out-the-internet'})
		MATCH (p:Node {node_id:'in-the-internet'})
		WITH m, n, o, p, CASE m WHEN NOT NULL THEN [1] ELSE [] END AS make_cat
		FOREACH (i IN make_cat |
			MERGE (m) -[:SECURED]-> (n)
		)
		WITH m, n, o, p, CASE WHEN m.is_egress AND m.cidr_ipv4 = "0.0.0.0/0" THEN [1] ELSE [] END AS make_cat2
		FOREACH (i IN make_cat2 |
			MERGE (n) <-[:PUBLIC]- (o)
		)
		WITH m, n, o, p, CASE WHEN NOT m.is_egress AND m.cidr_ipv4 = "0.0.0.0/0" THEN [1] ELSE [] END AS make_cat3
		FOREACH (i IN make_cat3 |
			MERGE (n) <-[:PUBLIC]- (p)
		)`,
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
		WITH n, apoc.convert.fromJsonMap(n.network_configuration) as map
		MATCH (m:CloudResource)
		WHERE m.node_type IN $task_types
		AND n.service_name = split(m.group, ":")[1]
		AND m.last_status = $status
		AND map.AwsvpcConfiguration.AssignPublicIp = $enabled
		WITH m, n LIMIT 10000
		SET m.linked = true
		WITH m, n
		MATCH (p:Node {node_id:'in-the-internet'})
		MERGE (m) <-[:PUBLIC]- (p)
		MERGE (n) <-[:PUBLIC]- (p)`,
		map[string]interface{}{
			"types":      resource_ecs[:],
			"task_types": resource_ecs_task[:],
			"status":     ecsTaskRunningStatus,
			"enabled":    ecsTaskPublicEnabledConfig,
		}, txConfig); err != nil {
		return err
	}

	log.Debug().Msgf("Link task took: %v", time.Since(start))

	return nil
}

var linkNodesRunning = atomic.Bool{}

func LinkNodes(ctx context.Context, task *asynq.Task) error {
	if linkNodesRunning.Swap(true) {
		return nil
	}
	defer linkNodesRunning.Store(false)

	log.Info().Msgf("Link Nodes Starting")
	defer log.Info().Msgf("Link Nodes Done")

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

func RetryScansDB(ctx context.Context, task *asynq.Task) error {

	log.Info().Msgf("Retry scan DB Starting")
	defer log.Info().Msgf("Retry scan DB Done")
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

func RetryUpgradeAgent(ctx context.Context, task *asynq.Task) error {
	log.Info().Msgf("Retry upgrade DB Starting")
	defer log.Info().Msgf("Retry upgrade DB Done")
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
