package cronjobs

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	dbReportCleanUpTimeout   = time.Minute * 2
	dbRegistryCleanUpTimeout = time.Minute * 30
	dbScanTimeout            = time.Minute * 2
	dbUpgradeTimeout         = time.Minute * 5
)

var BenchmarksAvailable = []string{"cis", "nist", "pci", "gdpr", "hipaa", "soc_2"}

type Benchmark struct {
	BenchmarkId   string            `json:"benchmark_id"`
	Description   string            `json:"description"`
	Title         string            `json:"title"`
	Tags          map[string]string `json:"tags"`
	Documentation string            `json:"documentation"`
	Children      []string          `json:"children"`
}

type Control struct {
	CategoryBreadcrumb      string            `json:"category_breadcrumb"`
	CategoryHierarchy       []string          `json:"category_hierarchy"`
	ControlId               string            `json:"control_id"`
	Description             string            `json:"description"`
	Title                   string            `json:"title"`
	Tags                    map[string]string `json:"tags"`
	Documentation           string            `json:"documentation"`
	ParentControlHierarchy  []string          `json:"parent_control_hierarchy"`
	ParentControlBreadcrumb string            `json:"parent_control_breadcrumb"`
	Executable              bool              `json:"executable"`
}

func CleanUpDB(msg *message.Message) error {
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	if _, err = session.Run(`
		MATCH (n:Node)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 100000
		SET n.agent_running=false`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (n:ContainerImage)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 100000
		DETACH DELETE n`,
		map[string]interface{}{"time_ms": dbRegistryCleanUpTimeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (n:Container)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 100000
		DETACH DELETE n`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (n:Pod)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 100000
		DETACH DELETE n`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (n:Process)
		WHERE n.updated_at < TIMESTAMP()-$time_ms
		WITH n LIMIT 100000
		DETACH DELETE n`,
		map[string]interface{}{"time_ms": dbReportCleanUpTimeout.Milliseconds()}); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (n) -[:SCANNED]-> (:Node)
		WHERE n.retries >= 3
		WITH n LIMIT 100000
		SET n.status = $new_status`,
		map[string]interface{}{
			"time_ms":    dbScanTimeout.Milliseconds(),
			"new_status": utils.SCAN_STATUS_FAILED,
		}); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (:AgentVersion) -[n:SCHEDULED]-> (:Node)
		WHERE n.retries >= 3
		WITH n LIMIT 100000
		SET n.status = $new_status`,
		map[string]interface{}{
			"time_ms":    dbUpgradeTimeout.Milliseconds(),
			"new_status": utils.SCAN_STATUS_FAILED,
		}); err != nil {
		return err
	}

	return nil
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
	session.Run("CREATE CONSTRAINT ON (n:Secret) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:SecretRule) ASSERT n.rule_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Malware) ASSERT n.malware_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:MalwareRule) ASSERT n.rule_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Vulnerability) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:VulnerabilityStub) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:SecurityGroup) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:CloudResource) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:RegistryAccount) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:Compliance) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
	session.Run("CREATE CONSTRAINT ON (n:CloudCompliance) ASSERT n.node_id IS UNIQUE", map[string]interface{}{})
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

	session.Run("MERGE (n:Node{node_id:'in-the-internet', cloud_provider:'internet', cloud_region: 'internet', depth: 0})", map[string]interface{}{})
	session.Run("MERGE (n:Node{node_id:'out-the-internet', cloud_provider:'internet', cloud_region: 'internet', depth: 0})", map[string]interface{}{})
	session.Run("MERGE (n:Node{node_id:'deepfence-console-cron', cloud_provider:'internet', cloud_region: 'internet', depth: 0})", map[string]interface{}{})

	// Indexes for fast searching & ordering
	addIndexOnIssuesCount(session, "ContainerImage")
	addIndexOnIssuesCount(session, "Container")

	err = addCloudControls(session)
	if err != nil {
		return err
	}
	return nil
}

func addCloudControls(session neo4j.Session) error {
	cwd := "/cloud_controls/aws"
	for _, benchmark := range BenchmarksAvailable {
		controlFilePath := fmt.Sprintf("%s/%s.json", cwd, benchmark)
		controlsJson, err := os.ReadFile(controlFilePath)
		if err != nil {
			return fmt.Errorf("Error reading controls file %s: %s", controlFilePath, err.Error())
		}
		var controlList []Control
		if err := json.Unmarshal(controlsJson, &controlList); err != nil {
			return fmt.Errorf("Error unmarshalling controls for compliance type %s: %s", benchmark, err.Error())
		}
		if _, err = session.Run(`
		UNWIND $batch as row
		MERGE (n:CloudComplianceExecutable:CloudComplianceControl{
			node_id: row.parent_control_breadcrumb + row.control_id,
			control_id: row.control_id,
			type: 'control',
			description: row.description,
			title: row.title,
			documentation: row.documentation,
			service: row.tags.service,
			cloud_provider: row.tags.plugin,
			category: row.tags.category,
			compliance_type: $benchmark,
			parent_control_hierarchy: row.parent_control_hierarchy,
			parent_control_breadcrumb: row.parent_control_breadcrumb,
			category_hierarchy: row.category_hierarchy,
			category_breadcrumb: row.category_breadcrumb,
			executable: row.executable
		})
		ON CREATE
			SET n.active = true`,
			map[string]interface{}{
				"batch":     controlList,
				"benchmark": benchmark,
			}); err != nil {
			return err
		}
		benchmarkFilePath := fmt.Sprintf("%s/%s_benchmarks.json", cwd, benchmark)
		benchmarksJson, err := os.ReadFile(benchmarkFilePath)
		if err != nil {
			return fmt.Errorf("Error reading benchmarks file %s: %s", benchmarkFilePath, err.Error())
		}
		var benchmarkList []Benchmark
		if err := json.Unmarshal(benchmarksJson, &benchmarkList); err != nil {
			return fmt.Errorf("Error unmarshalling benchmarks for compliance type %s: %s", benchmark, err.Error())
		}
		if _, err = session.Run(`
		UNWIND $batch as row
		MERGE (n:CloudComplianceExecutable:CloudComplianceBenchmark{
			node_id: row.benchmark_id,
			benchmark_id: row.benchmark_id,
			type: 'benchmark',
			description: row.description,
			title: row.title,
			documentation: row.documentation,
			service: row.tags.service,
			cloud_provider: row.tags.plugin,
			category: row.tags.category,
			executable: false
		})
		UNWIND row.children AS childControl
		MATCH (m:CloudComplianceExecutable{control_id: childControl})
		MERGE (n) -[:INCLUDES]-> (m)
		`,
			map[string]interface{}{
				"batch": benchmarkList,
			}); err != nil {
			return err
		}
	}
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
