package cronjobs

import (
	"encoding/json"
	"fmt"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"os"
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

func AddCloudControls(msg *message.Message) error {
	log.Info().Msgf("Starting Cloud Compliance Population")
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
		var controlMap []map[string]interface{}
		for _, control := range controlList {
			controlMap = append(controlMap, utils.ToMap(control))
		}
		if _, err = tx.Run(`
		UNWIND $batch as row
		MERGE (n:CloudComplianceExecutable:CloudComplianceControl{
			node_id: row.parent_control_breadcrumb + row.control_id,
			control_id: row.control_id,
			type: 'control',
			description: row.description,
			title: row.title,
			documentation: row.documentation,
			service: 'AWS',
			cloud_provider: 'aws',
			category: 'Compliance',
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
				"batch":     controlMap,
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
		var benchmarkMap []map[string]interface{}
		for _, benchMark := range benchmarkList {
			benchmarkMap = append(benchmarkMap, utils.ToMap(benchMark))
		}
		if _, err = tx.Run(`
		UNWIND $batch as row
		MERGE (n:CloudComplianceExecutable:CloudComplianceBenchmark{
			node_id: row.benchmark_id,
			benchmark_id: row.benchmark_id,
			type: 'benchmark',
			description: row.description,
			title: row.title,
			documentation: row.documentation,
			service: 'AWS',
			cloud_provider: 'aws',
			category: 'Compliance',
			executable: false
		})
		WITH row.children AS children
		UNWIND children AS childControl
		MATCH (m:CloudComplianceExecutable{control_id: childControl})
		MERGE (n) -[:INCLUDES]-> (m)
		`,
			map[string]interface{}{
				"batch": benchmarkMap,
			}); err != nil {
			return err
		}
	}
	return nil
}
