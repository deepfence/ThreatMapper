package cronjobs

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/threatintel"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const cloudControlsBasePath = "/cloud_controls"

var BenchmarksAvailableMap = map[string][]string{
	"aws":        {"cis", "nist", "pci", "gdpr", "hipaa", "soc_2", "aws_foundational_security"},
	"gcp":        {"cis", "nist", "pci", "hipaa"},
	"azure":      {"cis", "nist", "pci", "hipaa"},
	"kubernetes": {"nsa-cisa"},
	"linux":      {"hipaa", "nist", "pci", "gdpr"},
}

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
	CategoryHierarchyShort  string            `json:"category_hierarchy_short"`
	ControlId               string            `json:"control_id"`
	Description             string            `json:"description"`
	Title                   string            `json:"title"`
	Tags                    map[string]string `json:"tags"`
	Documentation           string            `json:"documentation"`
	ParentControlHierarchy  []string          `json:"parent_control_hierarchy"`
	ParentControlBreadcrumb string            `json:"parent_control_breadcrumb"`
	Executable              bool              `json:"executable"`
	ProblemTitle            string            `json:"problem_title"`
}

func AddCloudControls(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	// fetch rules from file server
	fpath, _, err := threatintel.FetchPostureControlsInfo(ctx)
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}

	mc, err := directory.FileServerClient(directory.WithDatabaseContext(ctx))
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}

	buff, err := mc.DownloadFileContexts(ctx, fpath, minio.GetObjectOptions{})
	if err != nil {
		log.Error().Err(err).Msgf("failed to download file %s", fpath)
		return err
	}

	// cleanup old controls
	os.RemoveAll(cloudControlsBasePath)
	os.MkdirAll(cloudControlsBasePath, 0755)

	if err := utils.ExtractTarGz(bytes.NewReader(buff), cloudControlsBasePath); err != nil {
		return err
	}

	log.Info().Msgf("Starting Cloud Compliance Population")
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msgf(err.Error())
		return nil
	}
	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(300*time.Second))
	if err != nil {
		log.Error().Msgf(err.Error())
		return nil
	}
	defer tx.Close(ctx)

	if _, err = tx.Run(ctx, `
		MATCH (n:CloudComplianceControl)
		SET n.disabled=true`, map[string]interface{}{}); err != nil {
		log.Error().Msgf(err.Error())
		return nil
	}

	for cloud, benchmarksAvailable := range BenchmarksAvailableMap {
		ctx, span := telemetry.NewSpan(ctx, "cloud-compliance", cloud+"-cloud-compliance-control")
		defer span.End()

		cwd := path.Join(cloudControlsBasePath, cloud)
		for _, benchmark := range benchmarksAvailable {
			controlFilePath := fmt.Sprintf("%s/%s.json", cwd, benchmark)
			controlsJson, err := os.ReadFile(controlFilePath)
			if err != nil {
				log.Error().Msgf("error reading controls file %s: %s", controlFilePath, err.Error())
				span.RecordErr(err)
				// skip loading control
				continue
			}
			var controlList []Control
			if err := json.Unmarshal(controlsJson, &controlList); err != nil {
				log.Error().Msgf("error unmarshalling controls for compliance type %s: %s", benchmark, err.Error())
				span.EndWithErr(err)
				return nil
			}
			var controlMap []map[string]interface{}
			for _, control := range controlList {
				controlMap = append(controlMap, utils.ToMap(control))
			}
			if _, err = tx.Run(ctx, `
		UNWIND $batch as row
		MERGE (n:CloudComplianceExecutable:CloudComplianceControl{
			node_id: row.parent_control_breadcrumb + row.control_id
		})
		ON CREATE
			SET n.active = true,
			n.disabled = false,
			n.control_id = row.control_id,
			n.benchmark_id = row.benchmark_id,
			n.description = row.description,
			n.title = row.title,
			n.documentation = row.documentation,
			n.service = $cloudCap,
			n.cloud_provider = $cloud,
			n.category = 'Compliance',
			n.parent_control_hierarchy = row.parent_control_hierarchy,
			n.category_hierarchy = row.category_hierarchy,
			n.category_hierarchy_short = row.category_hierarchy_short,
			n.problem_title = row.problem_title,
			n.compliance_type = $benchmark,
			n.executable = false
		ON MATCH
			SET n.disabled = false,
			n.description = row.description,
			n.title = row.title,
			n.documentation = row.documentation,
			n.service = $cloudCap,
			n.parent_control_hierarchy = row.parent_control_hierarchy,
			n.category_hierarchy = row.category_hierarchy,
			n.category_hierarchy_short = row.category_hierarchy_short,
			n.problem_title = row.problem_title`,
				map[string]interface{}{
					"batch":     controlMap,
					"benchmark": benchmark,
					"cloud":     cloud,
					"cloudCap":  strings.ToUpper(cloud),
				}); err != nil {
				log.Error().Msgf(err.Error())
				span.EndWithErr(err)
				return nil
			}
			benchmarkFilePath := fmt.Sprintf("%s/%s_benchmarks.json", cwd, benchmark)
			if _, err := os.Stat(benchmarkFilePath); err == nil {
				benchmarksJson, err := os.ReadFile(benchmarkFilePath)
				if err != nil {
					log.Error().Msgf("Error reading benchmarks file %s: %s", benchmarkFilePath, err.Error())
					span.EndWithErr(err)
					return nil
				}
				var benchmarkList []Benchmark
				if err := json.Unmarshal(benchmarksJson, &benchmarkList); err != nil {
					log.Error().Msgf("Error unmarshalling benchmarks for compliance type %s: %s", benchmark, err.Error())
					span.EndWithErr(err)
					return nil
				}
				var benchmarkMap []map[string]interface{}
				for _, benchMark := range benchmarkList {
					benchmarkMap = append(benchmarkMap, utils.ToMap(benchMark))
				}
				if _, err = tx.Run(ctx, `
		UNWIND $batch as row
		MERGE (n:CloudComplianceExecutable:CloudComplianceBenchmark{
			node_id: row.benchmark_id
		})
		ON CREATE
			SET n.benchmark_id = row.benchmark_id,
			n.description = row.description,
			n.title = row.title,
			n.documentation = row.documentation,
			n.service = $cloudCap,
			n.cloud_provider = $cloud,
			n.category = 'Compliance',
			n.compliance_type = $benchmark,
			n.executable = false
		ON MATCH
			SET n.description = row.description,
			n.title = row.title,
			n.documentation = row.documentation,
			n.service = $cloudCap
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
					span.EndWithErr(err)
					return nil
				}
			}
		}
	}
	// connect controls to parent root benchmarks
	if _, err = tx.Run(ctx, `
	MATCH (n:CloudComplianceControl)
	MATCH (b:CloudComplianceBenchmark{benchmark_id:n.parent_control_hierarchy[0]})
	MERGE (b)-[:PARENT]->(n)`, map[string]interface{}{}); err != nil {
		log.Error().Msgf(err.Error())
		return nil
	}
	log.Info().Msgf("Updated Cloud Compliance Controls")
	return tx.Commit(ctx)
}

func CachePostureProviders(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	log.Info().Msgf("Caching Posture Providers")
	defer log.Info().Msgf("Caching Posture Providers - Done")

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(120*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

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
		var account_count_query, resource_count_query, scan_count_query, success_count_query, global_count_query string
		passStatus := []string{"ok", "info", "skip"}
		if postureProviderName == model.PostureProviderLinux || postureProviderName == model.PostureProviderKubernetes {
			postureProvider.NodeLabel = nodeLabel
			if postureProviderName == model.PostureProviderLinux {
				passStatus = []string{"warn", "pass"}
			}

			account_count_query = `
			MATCH (n:` + string(neo4jNodeType) + `)
			WHERE n.pseudo=false and n.active=true and n.agent_running=true
			RETURN count(distinct n)`

			resource_count_query = `RETURN 0`

			scan_count_query = `
			MATCH (n:` + string(neo4jNodeType) + `)
			WHERE n.pseudo=false and n.agent_running=true
			MATCH (n) <-[:SCANNED]- (m:` + string(utils.NEO4JComplianceScan) + `)
			RETURN count(distinct n)`

			success_count_query = `
			MATCH (n:` + string(neo4jNodeType) + `)
			WHERE n.pseudo=false and n.active=true and n.agent_running=true
			MATCH (n) <-[:SCANNED]- (m:` + string(utils.NEO4JComplianceScan) + `) -[:DETECTED]-> (c:Compliance)
			MATCH (m) -[:DETECTED] -> (c:Compliance)
			WHERE c.status IN $passStatus
			RETURN count(distinct c)`

			global_count_query = `
			MATCH (n:` + string(neo4jNodeType) + `)
			WHERE n.pseudo=false and n.active=true and n.agent_running=true
			MATCH (n) <-[:SCANNED]- (m:` + string(utils.NEO4JComplianceScan) + `) -[:DETECTED]-> (c:Compliance)
			MATCH (m) -[:DETECTED] -> (c:Compliance)
			RETURN count(distinct c)`

		} else if postureProviderName == model.PostureProviderAWSOrg || postureProviderName == model.PostureProviderGCPOrg || postureProviderName == model.PostureProviderAzureOrg {
			postureProvider.NodeLabel = "Organizations"

			account_count_query = `
			MATCH (o:` + string(neo4jNodeType) + `{cloud_provider:$cloud_provider+'_org'})
			WHERE o.active=true
			RETURN count(distinct o)`

			resource_count_query = `
			MATCH (m:` + string(neo4jNodeType) + `{cloud_provider: $cloud_provider}) -[:OWNS]-> (p:CloudResource)
			RETURN count(distinct p)`

			scan_count_query = `
			MATCH (o:` + string(neo4jNodeType) + `{cloud_provider:$cloud_provider+'_org'}) -[:IS_CHILD]-> (m:` + string(neo4jNodeType) + `)
			AND m.organization_id IS NOT NULL
			MATCH (n:` + string(utils.NEO4JCloudComplianceScan) + `)-[:SCANNED]->(m)
			RETURN count(distinct m)`

			success_count_query = `
			MATCH (o:` + string(neo4jNodeType) + `{cloud_provider:$cloud_provider+'_org'}) -[:IS_CHILD]-> (m:` + string(neo4jNodeType) + `)
			WHERE o.active=true
			AND m.organization_id IS NOT NULL
			MATCH (c:CloudCompliance) <-[:DETECTED]- (n:` + string(utils.NEO4JCloudComplianceScan) + `)-[:SCANNED]->(m)
			WHERE c.status IN $passStatus
			RETURN count(distinct c)`

			global_count_query = `
			MATCH (o:` + string(neo4jNodeType) + `{cloud_provider:$cloud_provider+'_org'}) -[:IS_CHILD]-> (m:` + string(neo4jNodeType) + `)
			WHERE o.active=true
			AND m.organization_id IS NOT NULL
			MATCH (c:CloudCompliance) <-[:DETECTED]- (n:` + string(utils.NEO4JCloudComplianceScan) + `)-[:SCANNED]->(m)
			RETURN count(distinct c)`

		} else {
			postureProvider.NodeLabel = "Accounts"
			account_count_query = `
			MATCH (m:` + string(neo4jNodeType) + `{cloud_provider: $cloud_provider})
			WHERE m.active=true
			RETURN count(distinct m)`

			resource_count_query = `
			MATCH (p:CloudResource{cloud_provider: $cloud_provider})
			RETURN count(distinct p)`

			scan_count_query = `
			MATCH (m:` + string(neo4jNodeType) + `{cloud_provider: $cloud_provider})
			MATCH (n:` + string(utils.NEO4JCloudComplianceScan) + `)-[:SCANNED]->(m)
			RETURN count(distinct m)`

			success_count_query = `
			MATCH (m:` + string(neo4jNodeType) + `{cloud_provider: $cloud_provider})
			WHERE m.active=true
			MATCH (c:CloudCompliance) <-[:DETECTED]- (n:` + string(utils.NEO4JCloudComplianceScan) + `)-[:SCANNED]->(m)
			WHERE c.status IN $passStatus
			RETURN count(distinct c)`

			global_count_query = `
			MATCH (m:` + string(neo4jNodeType) + `{cloud_provider: $cloud_provider})
			WHERE m.active=true
			MATCH (c:CloudCompliance) <-[:DETECTED]- (n:` + string(utils.NEO4JCloudComplianceScan) + `)-[:SCANNED]->(m)
			RETURN count(distinct c)`
		}

		node_count, err := getCount(ctx, tx, account_count_query,
			map[string]interface{}{
				"cloud_provider": postureProviderName,
				"passStatus":     passStatus,
			},
		)

		if err != nil {
			log.Error().Msgf("%v", err)
			continue
		}

		resource_count, err := getCount(ctx, tx, resource_count_query,
			map[string]interface{}{
				"cloud_provider": postureProviderName,
				"passStatus":     passStatus,
			},
		)

		if err != nil {
			log.Error().Msgf("%v", err)
			continue
		}

		scan_count, err := getCount(ctx, tx, scan_count_query,
			map[string]interface{}{
				"cloud_provider": postureProviderName,
				"passStatus":     passStatus,
			},
		)

		if err != nil {
			log.Error().Msgf("%v", err)
			continue
		}

		success_count, err := getCount(ctx, tx, success_count_query,
			map[string]interface{}{
				"cloud_provider": postureProviderName,
				"passStatus":     passStatus,
			},
		)

		if err != nil {
			log.Error().Msgf("%v", err)
			continue
		}

		global_count, err := getCount(ctx, tx, global_count_query,
			map[string]interface{}{
				"cloud_provider": postureProviderName,
				"passStatus":     passStatus,
			},
		)

		if err != nil {
			log.Error().Msgf("%v", err)
			continue
		}

		var percent float64
		if global_count != 0 {
			percent = float64(success_count) / float64(global_count) * 100
		}
		postureProvider.NodeCount = node_count
		postureProvider.ResourceCount = resource_count
		postureProvider.ScanCount = scan_count
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

func getCount(ctx context.Context, tx neo4j.ExplicitTransaction, query string, params map[string]interface{}) (int64, error) {
	ctx, span := telemetry.NewSpan(ctx, "cloud-compliance", "get-count")
	defer span.End()

	log.Debug().Msgf("Cloud compliance query: %v", query)
	nodeRes, err := tx.Run(ctx, query, params)
	if err != nil {
		return 0, err
	}
	nodeRec, err := nodeRes.Single(ctx)
	if err != nil {
		return 0, err
	}
	return nodeRec.Values[0].(int64), nil
}
