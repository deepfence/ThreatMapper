package cronscheduler

import (
	"context"
	"fmt"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func RunDisplayError(session neo4j.Session, statement string) {
	_, err := session.Run(statement, map[string]interface{}{})
	if err != nil {
		log.Error().Msgf("%s, err: %v", statement, err)
	}
}

func initNeo4jDatabase(ctx context.Context) error {

	log := log.WithCtx(ctx)

	log.Info().Msgf("Init Neo4j Constraints")
	defer log.Info().Msgf("Init Neo4j Constraints - Done")

	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	RunDisplayError(session, "CREATE CONSTRAINT ON (n:CloudProvider) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:CloudRegion) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:AgentVersion) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:KubernetesCluster) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:ContainerImage) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:ImageStub) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:ImageTag) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:Node) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:Container) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:Pod) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:Process) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:Secret) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:SecretRule) ASSERT n.rule_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:Malware) ASSERT n.malware_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:MalwareRule) ASSERT n.rule_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:Vulnerability) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:VulnerabilityStub) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:SecurityGroup) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:CloudNode) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:CloudResource) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:RegistryAccount) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:Compliance) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:ComplianceRule) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:CloudCompliance) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:AgentDiagnosticLogs) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:CloudScannerDiagnosticLogs) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:CloudComplianceExecutable) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:CloudComplianceControl) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, "CREATE CONSTRAINT ON (n:CloudComplianceBenchmark) ASSERT n.node_id IS UNIQUE")
	RunDisplayError(session, fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4JSecretScan))
	RunDisplayError(session, fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4JVulnerabilityScan))
	RunDisplayError(session, fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4JComplianceScan))
	RunDisplayError(session, fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4JCloudComplianceScan))
	RunDisplayError(session, fmt.Sprintf("CREATE CONSTRAINT ON (n:%s) ASSERT n.node_id IS UNIQUE", utils.NEO4JMalwareScan))
	RunDisplayError(session, fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4JSecretScan))
	RunDisplayError(session, fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4JVulnerabilityScan))
	RunDisplayError(session, fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4JComplianceScan))
	RunDisplayError(session, fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4JCloudComplianceScan))
	RunDisplayError(session, fmt.Sprintf("CREATE CONSTRAINT ON (n:Bulk%s) ASSERT n.node_id IS UNIQUE", utils.NEO4JMalwareScan))

	RunDisplayError(session, "MERGE (n:Node{node_id:'in-the-internet'}) SET n.node_name='The Internet (Inbound)', n.pseudo=true, n.cloud_provider='internet', n.cloud_region='internet', n.depth=0, n.active=true")
	RunDisplayError(session, "MERGE (n:Node{node_id:'out-the-internet'}) SET n.node_name='The Internet (Outbound)', n.pseudo=true, n.cloud_provider='internet', n.cloud_region='internet', n.depth=0, n.active=true")
	RunDisplayError(session, "MERGE (n:Node{node_id:'"+cronjobs.ConsoleAgentId+"'}) SET n.node_name='Console', n.pseudo=true, n.cloud_provider='internet', n.cloud_region='internet', n.depth=0, n.push_back=COALESCE(n.push_back,1)")

	// Indexes for fast searching & ordering
	addIndexOnIssuesCount(session, "ContainerImage")
	addIndexOnIssuesCount(session, "Container")

	RunDisplayError(session, "CREATE INDEX NodeDepth IF NOT EXISTS FOR (n:Node) ON (n.depth)")
	RunDisplayError(session, "CREATE INDEX CloudResourceDepth IF NOT EXISTS FOR (n:CloudResource) ON (n.depth)")
	RunDisplayError(session, "CREATE INDEX CloudResourceLinked IF NOT EXISTS FOR (n:CloudResource) ON (n.linked)")

	//Set the base updated_at field on the ALIAS relationship
	RunDisplayError(session, "WITH TIMESTAMP() as T MATCH(:ContainerImage) -[a:ALIAS]-> (:ImageTag) WHERE a.updated_at IS NULL SET a.updated_at=T")

	return nil
}

func addIndexOnIssuesCount(session neo4j.Session, node_type string) {
	RunDisplayError(session, fmt.Sprintf("CREATE INDEX %sOrderByVulnerabilitiesCount IF NOT EXISTS FOR (n:%s) ON (n.vulnerabilities_count)", node_type, node_type))
	RunDisplayError(session, fmt.Sprintf("CREATE INDEX %sOrderBySecretsCount IF NOT EXISTS FOR (n:%s) ON (n.vulnerabilities_count)", node_type, node_type))
	RunDisplayError(session, fmt.Sprintf("CREATE INDEX %sOrderByMalwaresCount IF NOT EXISTS FOR (n:%s) ON (n.secrets_count)", node_type, node_type))
	RunDisplayError(session, fmt.Sprintf("CREATE INDEX %sOrderByCompliancesCount IF NOT EXISTS FOR (n:%s) ON (n.compliances_count)", node_type, node_type))
	RunDisplayError(session, fmt.Sprintf("CREATE INDEX %sOrderByCloudCompliancesCount IF NOT EXISTS FOR (n:%s) ON (n.cloud_compliances_count)", node_type, node_type))
}
