package cronjobs

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

var BenchmarksAvailableMap = map[string][]string{
	"aws":        {"cis", "nist", "pci", "gdpr", "hipaa", "soc_2"},
	"gcp":        {"cis"},
	"azure":      {"cis", "nist", "pci", "hipaa"},
	"kubernetes": {"nsa-cisa"},
	"linux":      {"hipaa", "nist", "pci", "gdpr"}}

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

func AddCloudControls(msg *message.Message) error {
	topic := RecordOffsets(msg)
	defer SetTopicHandlerStatus(topic, false)

	log.Info().Msgf("Starting Cloud Compliance Population")
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msgf(err.Error())
		return nil
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(300 * time.Second))
	if err != nil {
		log.Error().Msgf(err.Error())
		return nil
	}
	defer tx.Close()

	for cloud, benchmarksAvailable := range BenchmarksAvailableMap {
		cwd := "/cloud_controls/" + cloud
		for _, benchmark := range benchmarksAvailable {
			controlFilePath := fmt.Sprintf("%s/%s.json", cwd, benchmark)
			controlsJson, err := os.ReadFile(controlFilePath)
			if err != nil {
				log.Error().Msgf("error reading controls file %s: %s", controlFilePath, err.Error())
				return nil
			}
			var controlList []Control
			if err := json.Unmarshal(controlsJson, &controlList); err != nil {
				log.Error().Msgf("error unmarshalling controls for compliance type %s: %s", benchmark, err.Error())
				return nil
			}
			var controlMap []map[string]interface{}
			for _, control := range controlList {
				controlMap = append(controlMap, utils.ToMap(control))
			}
			if _, err = tx.Run(`
		UNWIND $batch as row
		MERGE (n:CloudComplianceExecutable:CloudComplianceControl{
			node_id: row.parent_control_breadcrumb + row.control_id
		})
		ON CREATE
			SET n.active = true,
			n.control_id = row.control_id,
			n.benchmark_id = row.benchmark_id,
			n.type = 'benchmark',
			n.description = row.description,
			n.title = row.title,
			n.documentation = row.documentation,
			n.service = $cloudCap,
			n.cloud_provider = $cloud,
			n.category = 'Compliance',
			n.parent_control_hierarchy = row.parent_control_hierarchy,
			n.category_hierarchy = row.category_hierarchy,
			n.compliance_type = $benchmark,
			n.executable = false`,
				map[string]interface{}{
					"batch":     controlMap,
					"benchmark": benchmark,
					"cloud":     cloud,
					"cloudCap":  strings.ToUpper(cloud),
				}); err != nil {
				log.Error().Msgf(err.Error())
				return nil
			}
			benchmarkFilePath := fmt.Sprintf("%s/%s_benchmarks.json", cwd, benchmark)
			if _, err := os.Stat(benchmarkFilePath); err == nil {
				benchmarksJson, err := os.ReadFile(benchmarkFilePath)
				if err != nil {
					log.Error().Msgf("Error reading benchmarks file %s: %s", benchmarkFilePath, err.Error())
					return nil
				}
				var benchmarkList []Benchmark
				if err := json.Unmarshal(benchmarksJson, &benchmarkList); err != nil {
					log.Error().Msgf("Error unmarshalling benchmarks for compliance type %s: %s", benchmark, err.Error())
					return nil
				}
				var benchmarkMap []map[string]interface{}
				for _, benchMark := range benchmarkList {
					benchmarkMap = append(benchmarkMap, utils.ToMap(benchMark))
				}
				if _, err = tx.Run(`
		UNWIND $batch as row
		MERGE (n:CloudComplianceExecutable:CloudComplianceBenchmark{
			node_id: row.benchmark_id
		})
		ON CREATE SET n.benchmark_id = row.benchmark_id,
			n.type = 'benchmark',
			n.description = row.description,
			n.title = row.title,
			n.documentation = row.documentation,
			n.service = $cloudCap,
			n.cloud_provider = $cloud,
			n.category = 'Compliance',
			n.compliance_type = $benchmark,
			n.executable = false
		WITH n, row.children AS children, row.benchmark_id AS benchmark_id
		UNWIND children AS childControl
		MATCH (m:CloudComplianceExecutable{control_id: childControl})
		WHERE benchmark_id = m.parent_control_hierarchy[-1]
		MERGE (n) -[:INCLUDES]-> (m)
		`,
					map[string]interface{}{
						"batch":     benchmarkMap,
						"benchmark": benchmark,
						"cloud":     cloud,
						"cloudCap":  strings.ToUpper(cloud),
					}); err != nil {
					log.Error().Msgf(err.Error())
					return nil
				}
			}
		}
	}
	log.Info().Msgf("Finishing Cloud Compliance Population")
	return tx.Commit()
}

func CachePostureProviders(msg *message.Message) error {
	topic := RecordOffsets(msg)
	defer SetTopicHandlerStatus(topic, false)

	log.Info().Msgf("Caching Posture Providers")
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(120 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	var postureProviders []model.PostureProvider
	for _, postureProviderName := range model.SupportedPostureProviders {
		postureProvider := model.PostureProvider{
			Name:                 postureProviderName,
			NodeCount:            0,
			NodeCountInactive:    0,
			ScanCount:            0,
			CompliancePercentage: 0,
			ResourceCount:        0,
		}
		neo4jNodeType := "CloudNode"
		nodeLabel := "Hosts"
		if postureProviderName == model.PostureProviderKubernetes {
			neo4jNodeType = "KubernetesCluster"
			nodeLabel = "Clusters"
		} else if postureProviderName == model.PostureProviderLinux {
			neo4jNodeType = "Node"
		}
		var query string
		passStatus := []string{"ok", "info", "skip"}
		var postureProviderName string
		if postureProviderName == model.PostureProviderLinux || postureProviderName == model.PostureProviderKubernetes {
			postureProvider.NodeLabel = nodeLabel
			if postureProviderName == model.PostureProviderLinux {
				passStatus = []string{"warn", "pass"}
			}

			query = `
			MATCH (n:` + string(neo4jNodeType) + `)
			WHERE n.pseudo=false and n.active=true and n.agent_running=true
			OPTIONAL MATCH (n) <-[:SCANNED]- (m:` + string(utils.NEO4J_COMPLIANCE_SCAN) + `) -[:DETECTED]-> (c:Compliance)
			OPTIONAL MATCH (m) -[:DETECTED] -> (c1:Compliance)
			WHERE c1.status IN $passStatus
			RETURN count(distinct n), 0, count(distinct m), count(distinct c1), count(distinct c)`
		} else if postureProviderName == model.PostureProviderAWSOrg || postureProviderName == model.PostureProviderGCPOrg {
			postureProviderName := model.PostureProviderGCP
			if postureProviderName == model.PostureProviderAWSOrg {
				postureProviderName = model.PostureProviderAWS
			}
			postureProvider.NodeLabel = "Organizations"

			query = `
			MATCH (o:` + string(neo4jNodeType) + `{cloud_provider:$cloud_provider+'aws_org'})
			WHERE o.active=true
			OPTIONAL MATCH (m:` + string(neo4jNodeType) + `{cloud_provider: "aws"}) -[:OWNS]-> (p:CloudResource)
			WHERE m.organization_id IS NOT NULL
			OPTIONAL MATCH (c:CloudCompliance) <-[:DETECTED]- (n:` + string(utils.NEO4J_CLOUD_COMPLIANCE_SCAN) + `)-[:SCANNED]->(m)<-[:IS_CHILD]-(o)
			OPTIONAL MATCH (c1:CloudCompliance) <-[:DETECTED]- (n)
			WHERE c1.status IN ["ok", "info", "skip"]
			RETURN count(distinct o), count(distinct p), count(distinct n), count(distinct c), count(distinct c1)`

		} else {
			postureProvider.NodeLabel = "Accounts"
			query = `
			MATCH (m:` + string(neo4jNodeType) + `{cloud_provider: $cloud_provider})
			WHERE m.active=true
			OPTIONAL MATCH (p:CloudResource{cloud_provider: $cloud_provider})
			OPTIONAL MATCH (c:CloudCompliance) <-[:DETECTED]- (n:` + string(utils.NEO4J_CLOUD_COMPLIANCE_SCAN) + `)-[:SCANNED]->(m)
			OPTIONAL MATCH (n) -[:DETECTED]-> (c1:CloudCompliance)
			WHERE c1.status IN $passStatus
			RETURN count(distinct m), count(distinct p), count(distinct n), count(distinct c), count(distinct c1)`

		}

		log.Debug().Msgf("Cloud compliance query: %v", query)
		nodeRes, err := tx.Run(query,
			map[string]interface{}{
				"cloud_provider": postureProviderName,
				"passStatus":     passStatus,
			},
		)
		if err != nil {
			log.Error().Msg(err.Error())
			continue
		}
		nodeRec, err := nodeRes.Single()
		if err != nil {
			log.Error().Msgf("Provider query error for %s: %v", postureProviderName, err)
			continue
		}
		var percent float64
		if nodeRec.Values[4].(int64) != 0 {
			percent = float64(nodeRec.Values[3].(int64)) / float64(nodeRec.Values[4].(int64)) * 100
		}
		postureProvider.NodeCount = nodeRec.Values[0].(int64)
		postureProvider.ResourceCount = nodeRec.Values[1].(int64)
		postureProvider.ScanCount = nodeRec.Values[2].(int64)
		postureProvider.CompliancePercentage = percent
		postureProviders = append(postureProviders, postureProvider)
	}

	postureProvidersJson, err := json.Marshal(postureProviders)
	if err != nil {
		return err
	}

	rdb, err := directory.RedisClient(ctx)
	if err != nil {
		return err
	}
	err = rdb.Set(ctx, constants.RedisKeyPostureProviders, string(postureProvidersJson), 0).Err()
	if err != nil {
		return err
	}
	return nil
}
