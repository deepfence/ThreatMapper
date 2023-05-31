package cronjobs

import (
	"context"
	"fmt"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	diagnosticLogsCleanUpTimeout           = time.Hour * 6
	dbReportCleanUpTimeoutBase             = time.Minute * 2
	dbScanTimeoutBase                      = time.Minute * 5
	dbRegistryCleanUpTimeout               = time.Hour * 24
	dbUpgradeTimeout                       = time.Minute * 30
	defaultDBScannedResourceCleanUpTimeout = time.Hour * 24 * 30
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

func CleanUpDB(msg *message.Message) error {
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

	txConfig := neo4j.WithTxTimeout(15 * time.Second)

	// Set inactives
	if _, err = session.Run(`
		MATCH (n:Node)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		AND NOT n.node_id IN ["in-the-internet", "out-the-internet"]
		WITH n LIMIT 10000
		SET n.active=false`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	// registry images
	if _, err = session.Run(`
		MATCH (n:ContainerImage) 
		WHERE exists((n)<-[:HOSTS]-(:RegistryAccount))
		AND n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 100000
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
		WITH n LIMIT 100000
		SET n.active=false`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeoutBase.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:Container)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 10000
		SET n.active=false`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:KubernetesCluster)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 10000
		SET n.active=false`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}, txConfig); err != nil {
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
		AND NOT exists((n) <-[:SCANNED]-())
		OR n.updated_at < TIMESTAMP()-$old_time_ms
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
		AND NOT exists((n) <-[:SCANNED]-())
		OR n.updated_at < TIMESTAMP()-$old_time_ms
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
		OR n.updated_at < TIMESTAMP()-$old_time_ms
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
		WHERE n.updated_at < TIMESTAMP()-$old_time_ms
		WITH n LIMIT 10000
		SET n.active = false`,
		map[string]interface{}{
			"old_time_ms": dbReportCleanUpTimeout.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:CloudResource)
		WHERE n.updated_at < TIMESTAMP()-$old_time_ms
		AND NOT exists((n) <-[:SCANNED]-())
		WITH n LIMIT 10000
		DETACH DELETE n`,
		map[string]interface{}{
			"old_time_ms": dbScannedResourceCleanUpTimeout.Milliseconds(),
		}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:CloudRegion)
		CALL {
			WITH n
			MATCH (m:CloudProvider) -[:HOSTS]-> (n) -[:HOSTS]-> (p:CloudResource) where p.cloud_provider = m.node_id and p.node_type in $cloud_types return (count(p) > 0) as active_region
		}
		SET n.active = active_region`,
		map[string]interface{}{"cloud_types": model.TopologyCloudResourceTypes}, txConfig); err != nil {
		log.Error().Msgf("Error in Clean up DB task: %v", err)
		return err
	}

	if _, err = session.Run(`
		MATCH (n:CloudRegion) -[:HOSTS]-> (m:Node)
		WHERE m.active = true
		WITH count(m) as c, n LIMIT 10000
		SET n.active = c <> 0`,
		map[string]interface{}{}, txConfig); err != nil {
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

	return nil
}

func RetryScansDB(msg *message.Message) error {
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

	return nil
}

func addIndexOnIssuesCount(session neo4j.Session, node_type string) {
	session.Run(fmt.Sprintf("CREATE INDEX %sOrderByVulnerabilitiesCount FOR (n:%s) ON (n.vulnerabilities_count)",
		node_type, node_type),
		map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE INDEX %sOrderBySecretsCount FOR (n:%s) ON (n.vulnerabilities_count)",
		node_type, node_type),
		map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE INDEX %sOrderByMalwaresCount FOR (n:%s) ON (n.secrets_count)",
		node_type, node_type),
		map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE INDEX %sOrderByCompliancesCount FOR (n:%s) ON (n.compliances_count)",
		node_type, node_type),
		map[string]interface{}{})
	session.Run(fmt.Sprintf("CREATE INDEX %sOrderByCloudCompliancesCount FOR (n:%s) ON (n.cloud_compliances_count)",
		node_type, node_type),
		map[string]interface{}{})
}
