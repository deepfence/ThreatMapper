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
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const (
	diagnosticLogsCleanUpTimeout           = time.Hour * 6
	dbReportCleanUpTimeoutBase             = time.Minute * 2
	dbScanTimeoutBase                      = time.Minute * 5
	dbRegistryCleanUpTimeout               = time.Hour * 24
	dbUpgradeTimeout                       = time.Minute * 30
	defaultDBScannedResourceCleanUpTimeout = time.Hour * 24 * 30
	dbCloudResourceCleanupTimeout          = time.Hour * 24
	ecsTaskRunningStatus                   = "RUNNING"
	ecsTaskPublicEnabledConfig             = "ENABLED"
	dbDeletionTimeThreshold                = time.Hour
)

var (
	awsResourceTypes           = [...]string{"aws_ec2_instance", "aws_ec2_application_load_balancer", "aws_ec2_classic_load_balancer", "aws_ec2_network_load_balancer"}
	awsResourceLambda          = [...]string{"aws_lambda_function"}
	awsResourceLink            = [...]string{"aws_lambda_function", "aws_ec2_instance", "aws_ec2_application_load_balancer", "aws_ec2_classic_load_balancer", "aws_ec2_network_load_balancer"}
	awsResourceEcs             = [...]string{"aws_ecs_service"}
	awsResourceEcsTask         = [...]string{"aws_ecs_task"}
	gcpCloudfunctionTypes      = [...]string{"gcp_cloudfunctions_function"}
	gcpStorageTypes            = [...]string{"gcp_storage_bucket"}
	gcpDatabaseTypes           = [...]string{"gcp_sql_database_instance"}
	azureResourceTypes         = [...]string{"azure_compute_virtual_machine"}
	azureStorageAccountTypes   = [...]string{"azure_storage_account"}
	azureStorageContainerTypes = [...]string{"azure_storage_container"}
	azureSqlServerTypes        = [...]string{"azure_mysql_server"}
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

func getPushBackValue(ctx context.Context, session neo4j.SessionWithContext) int32 {
	res, err := session.Run(ctx, `
		MATCH (n:Node{node_id:"`+ConsoleAgentId+`"})
		RETURN n.push_back`,
		map[string]interface{}{}, neo4j.WithTxTimeout(15*time.Second))
	if err != nil {
		return 1
	}
	rec, err := res.Single(ctx)
	if err != nil {
		return 1
	}
	return int32(rec.Values[0].(int64))
}

var cleanUpRunning = atomic.Bool{}

func CleanUpDB(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

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

	read_session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	pushBack := getPushBackValue(ctx, read_session)
	read_session.Close(ctx)

	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	dbReportCleanUpTimeout := dbReportCleanUpTimeoutBase * time.Duration(pushBack)
	dbScanTimeout := dbScanTimeoutBase * time.Duration(pushBack)

	txConfig := neo4j.WithTxTimeout(30 * time.Second)

	start := time.Now()

	// Set inactives
	if _, err = session.Run(ctx, `
		MATCH (n:Node)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND NOT n.node_id IN ["in-the-internet", "out-the-internet"]
		AND n.agent_running=true
		AND n.active = true
		WITH n LIMIT 10000
		SET n.active=false, n.updated_at=TIMESTAMP()`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:Node)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND n.agent_running=false
		AND n.active = true
		WITH n LIMIT 10000
		SET n.active=false, n.updated_at=TIMESTAMP()`,
		map[string]interface{}{"time_ms": dbCloudResourceCleanupTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	// registry images
	if _, err = session.Run(ctx, `
		MATCH (n:ContainerImage)<-[:HOSTS]-(m:RegistryAccount)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND n.active = true
		AND m.last_synced_at = m.updated_at
		WITH n LIMIT 10000
		SET n.active=false, n.updated_at=TIMESTAMP()`,
		map[string]interface{}{"time_ms": dbRegistryCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	// host images
	if _, err = session.Run(ctx, `
		MATCH (n:ContainerImage)
		WHERE NOT exists((n)<-[:HOSTS]-(:RegistryAccount))
		AND n.updated_at < TIMESTAMP()-$time_ms
		AND n.active = true
		WITH n LIMIT 10000
		SET n.active=false, n.updated_at=TIMESTAMP()`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeoutBase.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:ImageStub)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		OR NOT exists((n)<-[:IS]-(:ContainerImage))
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{"time_ms": dbRegistryCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:Container)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND n.active = true
		WITH n LIMIT 10000
		SET n.active=false, n.updated_at=TIMESTAMP()`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:KubernetesCluster)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND n.active = true
		AND n.agent_running=true
		WITH n LIMIT 10000
		SET n.active=false, n.updated_at=TIMESTAMP()`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:KubernetesCluster)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND n.active = true
		AND n.agent_running=false
		WITH n LIMIT 10000
		SET n.active=false, n.updated_at=TIMESTAMP()`,
		map[string]interface{}{"time_ms": dbCloudResourceCleanupTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	// Delete old with no data
	if _, err = session.Run(ctx, `
		MATCH (n:Node) <-[:HOSTS]- (cr:CloudRegion)
		WHERE n.active = false
		AND (NOT exists((n) <-[:SCANNED]-())
		AND n.updated_at < TIMESTAMP() - $delete_threshold_ms)
		OR n.updated_at < TIMESTAMP()-$old_time_ms
		WITH n, cr LIMIT 10000
		SET cr.res_shown = CASE WHEN n.kubernetes_cluster_id= "" or n.kubernetes_cluster_id is null THEN cr.res_shown - 1 ELSE cr.res_shown END,
			cr.active = cr.res_shown <> 0
		DETACH DELETE n`,
		map[string]interface{}{
			"time_ms":             dbReportCleanUpTimeout.Milliseconds(),
			"old_time_ms":         dbScannedResourceCleanUpTimeout.Milliseconds(),
			"delete_threshold_ms": dbDeletionTimeThreshold.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:ContainerImage)
		WHERE n.active = false
		AND ((NOT exists((n) <-[:SCANNED]-())
		AND n.updated_at < TIMESTAMP() - $delete_threshold_ms)
		OR n.updated_at < TIMESTAMP()-$old_time_ms)
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{
			"old_time_ms":         dbScannedResourceCleanUpTimeout.Milliseconds(),
			"delete_threshold_ms": dbDeletionTimeThreshold.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:Container)
		WHERE n.active = false
		AND ((NOT exists((n) <-[:SCANNED]-())
		AND n.updated_at < TIMESTAMP() - $delete_threshold_ms)
		OR n.updated_at < TIMESTAMP()-$old_time_ms)
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{
			"old_time_ms":         dbScannedResourceCleanUpTimeout.Milliseconds(),
			"delete_threshold_ms": dbDeletionTimeThreshold.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
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

	if _, err = session.Run(ctx, `
		MATCH (n:Pod)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:Process)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	for ts := range ingestersUtil.ScanStatusField {
		if _, err = session.Run(ctx, `
			MATCH (n:`+string(ts)+`) -[:SCANNED]-> (r)
			WHERE n.retries >= 3
			WITH n, r LIMIT 10000
			SET n.status = $new_status
			WITH n, r
			MATCH (r) WHERE r.`+ingestersUtil.LatestScanIDField[ts]+`=n.node_id
			SET r.`+ingestersUtil.ScanStatusField[ts]+`=n.status`,
			map[string]interface{}{
				"time_ms":    dbScanTimeout.Milliseconds(),
				"new_status": utils.ScanStatusFailed,
			}, txConfig); err != nil {
			log.Error().Msgf("Error in Clean up DB task: %v", err)
			return err
		}
	}

	if _, err = session.Run(ctx, `
		MATCH (:AgentVersion) -[n:SCHEDULED]-> (:Node)
		WHERE n.retries >= 3
		WITH n LIMIT 10000
		SET n.status = $new_status`,
		map[string]interface{}{
			"time_ms":    dbUpgradeTimeout.Milliseconds(),
			"new_status": utils.ScanStatusFailed,
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:AgentDiagnosticLogs)
		WHERE n.retries >= 3
		WITH n LIMIT 10000
		SET n.status = $new_status`,
		map[string]interface{}{
			"time_ms":    dbUpgradeTimeout.Milliseconds(),
			"new_status": utils.ScanStatusFailed,
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:CloudScannerDiagnosticLogs)
		WHERE n.retries >= 3
		WITH n LIMIT 10000
		SET n.status = $new_status`,
		map[string]interface{}{
			"time_ms":    dbUpgradeTimeout.Milliseconds(),
			"new_status": utils.ScanStatusFailed,
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:AgentVersion)
		WHERE n.url IS NULL
		AND NOT exists((n) -[:VERSIONED]-(:Node))
		DETACH DELETE n`,
		map[string]interface{}{}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:AgentDiagnosticLogs)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{
			"time_ms": diagnosticLogsCleanUpTimeout.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:CloudScannerDiagnosticLogs)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{
			"time_ms": diagnosticLogsCleanUpTimeout.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
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

	if _, err = session.Run(ctx, `
		MATCH (n:CloudResource) <-[:HOSTS]- (cr:CloudRegion)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND NOT exists((n) <-[:SCANNED]-())
		OR n.updated_at < TIMESTAMP()-$old_time_ms
		WITH n, cr LIMIT 10000
		SET cr.res_shown = CASE WHEN n.is_shown THEN cr.res_shown - 1 ELSE cr.res_shown END,
			cr.active = cr.res_shown <> 0
		WITH n
		DETACH DELETE n`,
		map[string]interface{}{
			"time_ms":     dbCloudResourceCleanupTimeout.Milliseconds(),
			"old_time_ms": dbScannedResourceCleanUpTimeout.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:CloudProvider) -[:HOSTS]-> (m)
		WHERE m.active = true
		WITH count(m) as c, n LIMIT 10000
		SET n.active = c <> 0`,
		map[string]interface{}{}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:CloudRegion)
		WHERE not (n) -[:HOSTS]-> ()
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(ctx, `
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

	log := log.WithCtx(ctx)

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

	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	txConfig := neo4j.WithTxTimeout(30 * time.Second)

	start := time.Now()

	if _, err = session.Run(ctx, `
		MATCH (n:CloudResource)
		WHERE not (n) <-[:HOSTS]- (:CloudRegion)
		AND NOT n.cloud_provider IS NULL
		AND NOT n.cloud_region IS NULL
		AND NOT n.account_id IS NULL
		WITH n LIMIT 50000
		MERGE (cp:CloudProvider{node_id: n.cloud_provider})
		MERGE (cr:CloudRegion{node_id: n.cloud_region})
		MERGE (m:CloudNode{node_id: n.account_id})
		ON CREATE SET m.cloud_provider = n.cloud_provider, m.active = true
		MERGE (m) -[:OWNS]-> (n)
		MERGE (cp) -[:HOSTS]-> (cr)
		MERGE (cr) -[:HOSTS]-> (n)
		WITH cr, n
		WHERE n.is_shown = true
		WITH cr, count(n) as cnt
		SET cr.res_shown = COALESCE(cr.res_shown, 0) + cnt`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:Node) <-[:HOSTS]- (cr:CloudRegion)
		WHERE n.active = true and (n.kubernetes_cluster_id= "" or n.kubernetes_cluster_id is null)
		WITH cr, count(n) as cnt
		SET cr.res_shown = COALESCE(cr.res_shown, 0) + cnt`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (cr:CloudRegion)
		WHERE NOT cr.res_shown IS NULL
		SET cr.active = cr.res_shown <> 0`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	// Handle AWS EC2 & LBs
	if _, err = session.Run(ctx, `
		MATCH (n:CloudResource)
		WHERE n.linked = false
		AND n.node_type in $types
		AND n.security_groups IS NOT NULL
		WITH n LIMIT 10000
		SET n.linked = true
		WITH n, apoc.convert.fromJsonList(n.security_groups) as groups
		UNWIND groups as subgroup
		WITH n, subgroup, CASE WHEN apoc.meta.cypher.type(subgroup) = "STRING" THEN subgroup ELSE subgroup.GroupName END as name,
		CASE WHEN apoc.meta.cypher.type(subgroup) = "STRING" THEN subgroup ELSE subgroup.GroupId END as node_id
		MATCH (m:CloudResource{id: "aws_vpc_security_group_rule"})
		WHERE m.node_id ENDS WITH node_id
		MERGE (m) -[:SECURED]-> (n)`,
		map[string]interface{}{
			"types": awsResourceTypes[:],
		}, txConfig); err != nil {
		return err
	}

	// Handle AWS Lambda
	if _, err = session.Run(ctx, `
		MATCH (n:CloudResource)
		WHERE n.linked = false
		AND n.node_type in $types
		WITH n LIMIT 10000
		SET n.linked = true
		WITH n, apoc.convert.fromJsonList(n.vpc_security_group_ids) as sec_group_ids
		UNWIND sec_group_ids as subgroup
		MATCH (m:CloudResource{id: "aws_vpc_security_group_rule"})
		WHERE m.node_id ENDS WITH subgroup
		MERGE (m) -[:SECURED]-> (n)`,
		map[string]interface{}{
			"types": awsResourceLambda[:],
		}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (m:CloudResource{id: "aws_vpc_security_group_rule"})
		WHERE m.is_egress
		AND m.cidr_ipv4 = "0.0.0.0/0"
		MATCH (m) -[:SECURED]-> (n:CloudResource)
		WHERE NOT exists( (n) -[:PUBLIC]-> (:Node{node_id:'out-the-internet'}))
		AND n.node_type in $types
		WITH n LIMIT 10000
		MERGE (n) -[:PUBLIC]-> (:Node{node_id:'out-the-internet'})`,
		map[string]interface{}{
			"types": awsResourceLink[:],
		}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (m:CloudResource{id: "aws_vpc_security_group_rule"})
		WHERE NOT m.is_egress
		AND m.cidr_ipv4 = "0.0.0.0/0"
		MATCH (m) -[:SECURED]-> (n:CloudResource)
		WHERE NOT exists( (:Node{node_id:'in-the-internet'}) -[:PUBLIC]-> (n))
		AND n.node_type in $types
		WITH n LIMIT 10000
		MERGE (:Node{node_id:'in-the-internet'}) -[:PUBLIC]-> (n)`,
		map[string]interface{}{
			"types": awsResourceLink[:],
		}, txConfig); err != nil {
		return err
	}

	// Handle AWS ECS
	if _, err = session.Run(ctx, `
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
			"types":      awsResourceEcs[:],
			"task_types": awsResourceEcsTask[:],
			"status":     ecsTaskRunningStatus,
			"enabled":    ecsTaskPublicEnabledConfig,
		}, txConfig); err != nil {
		return err
	}

	// Handle GCP CloudFunction
	if _, err = session.Run(ctx, `
		MATCH (n:CloudResource)
		WHERE n.linked = false
		AND n.node_type in $types
		AND n.ingress_settings IS NOT NULL
		WITH n LIMIT 10000
		SET n.linked = true
		WITH n
		MATCH (p:Node {node_id:'in-the-internet'})
		WHERE n.ingress_settings = 'ALLOW_ALL'
		MERGE (n) <-[:PUBLIC]- (p)
		`,
		map[string]interface{}{
			"types": gcpCloudfunctionTypes[:],
		}, txConfig); err != nil {
		return err
	}

	// Handle GCP Storage
	if _, err = session.Run(ctx, `
		MATCH (n:CloudResource)
		WHERE n.linked = false
		AND n.node_type in $types
		AND n.iam_policy IS NOT NULL
		WITH n LIMIT 10000
		SET n.linked = true
		WITH n, apoc.convert.fromJsonMap(n.iam_policy) as iam_policy
		UNWIND iam_policy.bindings as binding
		WITH n, binding
		MATCH (p:Node {node_id:'in-the-internet'})
		WHERE 'allAuthenticatedUsers' IN binding.members OR 'allUsers' IN binding.members
		MERGE (n) <-[:PUBLIC]- (p)`,
		map[string]interface{}{
			"types": gcpStorageTypes[:],
		}, txConfig); err != nil {
		return err
	}

	// Handle GCP Databases
	if _, err = session.Run(ctx, `
		MATCH (n:CloudResource)
		WHERE n.linked = false
		AND n.node_type in $types
		AND n.ip_configuration IS NOT NULL
		WITH n LIMIT 10000
		SET n.linked = true
		WITH n, apoc.convert.fromJsonMap(n.ip_configuration) as ip_configuration
		UNWIND ip_configuration.authorizedNetworks as authorizedNetwork
		WITH n, authorizedNetwork
		MATCH (p:Node {node_id:'in-the-internet'})
		WHERE authorizedNetwork.value = '0.0.0.0/0'
		MERGE (n) <-[:PUBLIC]- (p)`,
		map[string]interface{}{
			"types": gcpDatabaseTypes[:],
		}, txConfig); err != nil {
		return err
	}

	// Handle Azure VMs
	if _, err = session.Run(ctx, `
		MATCH (n:CloudResource)
		WHERE n.linked = false
		AND n.node_type in $types
		AND n.network_interfaces IS NOT NULL
		WITH n LIMIT 10000
		SET n.linked = true
		WITH n
		MATCH (p:Node {node_id:'in-the-internet'})
		WHERE n.public_ips IS NOT NULL AND n.public_ips <> []
		MERGE (n) <-[:PUBLIC]- (p)`,
		map[string]interface{}{
			"types": azureResourceTypes[:],
		}, txConfig); err != nil {
		return err
	}

	// Handle Azure Storage Account
	if _, err = session.Run(ctx, `
		MATCH (n:CloudResource)
		WHERE n.linked = false
		AND n.node_type in $types
		AND n.network_interfaces IS NOT NULL
		WITH n LIMIT 10000
		SET n.linked = true
		WITH n
		MATCH (p:Node {node_id:'in-the-internet'})
		WHERE n.allow_blob_public_access = true
		MERGE (n) <-[:PUBLIC]- (p)`,
		map[string]interface{}{
			"types": azureStorageAccountTypes[:],
		}, txConfig); err != nil {
		return err
	}

	// Handle Azure Storage Container
	if _, err = session.Run(ctx, `
		MATCH (n:CloudResource)
		WHERE n.linked = false
		AND n.node_type in $types
		AND n.network_interfaces IS NOT NULL
		WITH n LIMIT 10000
		SET n.linked = true
		WITH n
		MATCH (p:Node {node_id:'in-the-internet'})
		WHERE n.public_access IS NOT NULL
		MERGE (n) <-[:PUBLIC]- (p)`,
		map[string]interface{}{
			"types": azureStorageContainerTypes[:],
		}, txConfig); err != nil {
		return err
	}

	// Handle Azure SQL Server
	if _, err = session.Run(ctx, `
		MATCH (n:CloudResource)
		WHERE n.linked = false
		AND n.node_type in $types
		WITH n LIMIT 10000
		SET n.linked = true
		WITH n
		MATCH (p:Node {node_id:'in-the-internet'})
		WHERE n.public_network_access IS NOT NULL AND n.public_network_access = 'Enabled'
		MERGE (n) <-[:PUBLIC]- (p)`,
		map[string]interface{}{
			"types": azureSqlServerTypes[:],
		}, txConfig); err != nil {
		return err
	}

	log.Debug().Msgf("Link task took: %v", time.Since(start))

	return nil
}

var linkNodesRunning = atomic.Bool{}

func LinkNodes(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

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

	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	txConfig := neo4j.WithTxTimeout(30 * time.Second)

	start := time.Now()

	if _, err = session.Run(ctx, `
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

	if _, err := session.Run(ctx, `
		MATCH (n:Node) <-[:INSTANCIATE]- (k:KubernetesCluster)
		WHERE not (k) <-[:HOSTS]- (:CloudRegion)
		AND NOT n.cloud_region IS NULL
		MERGE (cr:CloudRegion{node_id:n.cloud_region})
		SET cr.active = true`,
		map[string]interface{}{}); err != nil {
		return err
	}

	if _, err := session.Run(ctx, `
		MATCH (n:KubernetesCluster)
		WHERE not (n) <-[:HOSTS]- (:CloudProvider)
		AND NOT n.cloud_provider IS NULL
		MERGE (cp:CloudProvider{node_id:n.cloud_provider})
		MERGE (cp) -[:HOSTS]-> (n)
		SET cp.active = true, cp.pseudo = false`,
		map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:ContainerImage)
		WHERE NOT exists((n) -[:ALIAS]-> ())
		MERGE (t:ImageTag{node_id: n.docker_image_name + "_" + n.docker_image_tag})
		MERGE (n) -[a:ALIAS]-> (t)
		SET t.updated_at = TIMESTAMP(), 
			a.updated_at = TIMESTAMP()`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(ctx, `
		MATCH (n:RegistryAccount)-[h:HOSTS]->(m:ContainerImage) -[r:ALIAS]-> (a)
		MATCH (a) <- [b:ALIAS] - (l:ContainerImage) -[h2:HOSTS]- (n)
		WHERE l.node_id <> m.node_id
		DELETE CASE WHEN r.updated_at < b.updated_at THEN h ELSE h2 END`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	log.Debug().Msgf("Link Nodes task took: %v", time.Since(start))

	return nil
}

func RetryScansDB(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	log.Info().Msgf("Retry scan DB Starting")
	defer log.Info().Msgf("Retry scan DB Done")
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	pushBack := getPushBackValue(ctx, session)
	dbScanTimeout := dbScanTimeoutBase * time.Duration(pushBack)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(15*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	if _, err = tx.Run(ctx, `
		MATCH (n) -[:SCANNED]-> ()
		WHERE n.status = $old_status
		AND n.updated_at < TIMESTAMP()-$time_ms
		AND n.retries < 3
		WITH n LIMIT 10000
		SET n.retries = n.retries + 1, n.status=$new_status`,
		map[string]interface{}{
			"time_ms":    dbScanTimeout.Milliseconds(),
			"old_status": utils.ScanStatusInProgress,
			"new_status": utils.ScanStatusStarting,
		}); err != nil {
		return err
	}

	if _, err = tx.Run(ctx, `
		MATCH (a:AgentDiagnosticLogs) -[:SCHEDULEDLOGS]-> (n)
		WHERE a.status = $old_status
		AND a.updated_at < TIMESTAMP()-$time_ms
		AND a.retries < 3
		WITH a LIMIT 10000
		SET a.retries = a.retries + 1, a.status=$new_status`,
		map[string]interface{}{
			"time_ms":    dbScanTimeout.Milliseconds(),
			"old_status": utils.ScanStatusInProgress,
			"new_status": utils.ScanStatusStarting,
		}); err != nil {
		return err
	}

	if _, err = tx.Run(ctx, `
		MATCH (a:CloudScannerDiagnosticLogs)
		WHERE a.status = $old_status
		AND a.updated_at < TIMESTAMP()-$time_ms
		AND a.retries < 3
		WITH a LIMIT 10000
		SET a.retries = a.retries + 1, a.status=$new_status`,
		map[string]interface{}{
			"time_ms":    dbScanTimeout.Milliseconds(),
			"old_status": utils.ScanStatusInProgress,
			"new_status": utils.ScanStatusStarting,
		}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func RetryUpgradeAgent(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	log.Info().Msgf("Retry upgrade DB Starting")
	defer log.Info().Msgf("Retry upgrade DB Done")
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	pushBack := getPushBackValue(ctx, session)
	dbScanTimeout := dbScanTimeoutBase * time.Duration(pushBack)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(15*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	if _, err = tx.Run(ctx, `
		MATCH (:AgentVersion) -[n:SCHEDULED]-> (:Node)
		WHERE n.status = $old_status
		AND n.updated_at < TIMESTAMP()-$time_ms
		AND n.retries < 3
		WITH n LIMIT 10000
		SET n.retries = n.retries + 1, n.status=$new_status`,
		map[string]interface{}{
			"time_ms":    dbScanTimeout.Milliseconds(),
			"old_status": utils.ScanStatusInProgress,
			"new_status": utils.ScanStatusStarting,
		}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
