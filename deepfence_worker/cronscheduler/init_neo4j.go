package cronscheduler

import (
	"context"
	"fmt"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func RunDisplayError(ctx context.Context, session neo4j.SessionWithContext, statement string) {
	_, err := session.Run(ctx, statement, map[string]interface{}{})
	if err != nil {
		log.Error().Msgf("%s, err: %v", statement, err)
	}
}

func initNeo4jDatabase(ctx context.Context) error {

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "cronjobs", "init-neo4j-database")
	defer span.End()

	log.Info().Msgf("Init Neo4j Constraints")
	defer log.Info().Msgf("Init Neo4j Constraints - Done")

	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:CloudProvider) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:CloudRegion) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:AgentVersion) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:KubernetesCluster) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:ContainerImage) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:ImageStub) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:ImageTag) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:Node) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:Container) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:Pod) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:Process) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:Secret) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:SecretRule) REQUIRE n.rule_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:Malware) REQUIRE n.malware_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:MalwareRule) REQUIRE n.rule_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:Vulnerability) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:VulnerabilityStub) REQUIRE n.rule_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:SecurityGroup) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:CloudNode) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:CloudResource) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:RegistryAccount) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:Compliance) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:ComplianceRule) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:CloudCompliance) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:AgentDiagnosticLogs) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:CloudScannerDiagnosticLogs) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:CloudComplianceExecutable) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:CloudComplianceControl) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:CloudComplianceBenchmark) REQUIRE n.node_id IS UNIQUE")
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE CONSTRAINT FOR (n:%s) REQUIRE n.node_id IS UNIQUE", utils.NEO4JSecretScan))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE CONSTRAINT FOR (n:%s) REQUIRE n.node_id IS UNIQUE", utils.NEO4JVulnerabilityScan))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE CONSTRAINT FOR (n:%s) REQUIRE n.node_id IS UNIQUE", utils.NEO4JComplianceScan))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE CONSTRAINT FOR (n:%s) REQUIRE n.node_id IS UNIQUE", utils.NEO4JCloudComplianceScan))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE CONSTRAINT FOR (n:%s) REQUIRE n.node_id IS UNIQUE", utils.NEO4JMalwareScan))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE CONSTRAINT FOR (n:Bulk%s) REQUIRE n.node_id IS UNIQUE", utils.NEO4JSecretScan))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE CONSTRAINT FOR (n:Bulk%s) REQUIRE n.node_id IS UNIQUE", utils.NEO4JVulnerabilityScan))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE CONSTRAINT FOR (n:Bulk%s) REQUIRE n.node_id IS UNIQUE", utils.NEO4JComplianceScan))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE CONSTRAINT FOR (n:Bulk%s) REQUIRE n.node_id IS UNIQUE", utils.NEO4JCloudComplianceScan))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE CONSTRAINT FOR (n:Bulk%s) REQUIRE n.node_id IS UNIQUE", utils.NEO4JMalwareScan))

	RunDisplayError(ctx, session, "MERGE (n:Node{node_id:'in-the-internet'}) SET n.node_name='The Internet (Inbound)', n.pseudo=true, n.cloud_provider='internet', n.cloud_region='internet', n.depth=0, n.active=true")
	RunDisplayError(ctx, session, "MERGE (n:Node{node_id:'out-the-internet'}) SET n.node_name='The Internet (Outbound)', n.pseudo=true, n.cloud_provider='internet', n.cloud_region='internet', n.depth=0, n.active=true")
	RunDisplayError(ctx, session, "MERGE (n:Node{node_id:'"+cronjobs.ConsoleAgentId+"'}) SET n.node_name='Console', n.pseudo=true, n.cloud_provider='internet', n.cloud_region='internet', n.depth=0, n.push_back=COALESCE(n.push_back,1)")

	// Indexes for fast searching & ordering
	addIndexOnIssuesCount(ctx, session, "ContainerImage")
	addIndexOnIssuesCount(ctx, session, "Container")

	RunDisplayError(ctx, session, "CREATE INDEX NodeDepth IF NOT EXISTS FOR (n:Node) ON (n.depth)")
	RunDisplayError(ctx, session, "CREATE INDEX CloudResourceDepth IF NOT EXISTS FOR (n:CloudResource) ON (n.depth)")
	RunDisplayError(ctx, session, "CREATE INDEX CloudResourceLinked IF NOT EXISTS FOR (n:CloudResource) ON (n.linked)")

	RunDisplayError(ctx, session, "CREATE INDEX CloudComplianceControlByControlID IF NOT EXISTS FOR (n:CloudComplianceControl) ON (n.control_id)")

	//Set the base updated_at field on the ALIAS relationship
	RunDisplayError(ctx, session, "WITH TIMESTAMP() as T MATCH(:ContainerImage) -[a:ALIAS]-> (:ImageTag) WHERE a.updated_at IS NULL SET a.updated_at=T")

	RunDisplayError(ctx, session, "MATCH (n:CloudNode) WHERE COALESCE(n.refresh_status, '') = '' AND n.cloud_provider in ['"+model.PostureProviderAWS+"','"+model.PostureProviderGCP+"','"+model.PostureProviderAzure+"'] SET n.refresh_status='"+utils.ScanStatusStarting+"', n.refresh_message='', n.refresh_metadata=''")

	RunDisplayError(ctx, session, "CREATE CONSTRAINT FOR (n:DeepfenceRule) REQUIRE n.node_id IS UNIQUE")
	return nil
}

func addIndexOnIssuesCount(ctx context.Context, session neo4j.SessionWithContext, node_type string) {
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE INDEX %sOrderByVulnerabilitiesCount IF NOT EXISTS FOR (n:%s) ON (n.vulnerabilities_count)", node_type, node_type))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE INDEX %sOrderBySecretsCount IF NOT EXISTS FOR (n:%s) ON (n.vulnerabilities_count)", node_type, node_type))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE INDEX %sOrderByMalwaresCount IF NOT EXISTS FOR (n:%s) ON (n.secrets_count)", node_type, node_type))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE INDEX %sOrderByCompliancesCount IF NOT EXISTS FOR (n:%s) ON (n.compliances_count)", node_type, node_type))
	RunDisplayError(ctx, session, fmt.Sprintf("CREATE INDEX %sOrderByCloudCompliancesCount IF NOT EXISTS FOR (n:%s) ON (n.cloud_compliances_count)", node_type, node_type))
}
