package reporters

import (
	"errors"

	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

var (
	ErrNotFound        = errors.New("resource not found")
	ScanResultMaskNode = map[utils.Neo4jScanType]string{
		utils.NEO4JVulnerabilityScan:   "VulnerabilityStub",
		utils.NEO4JSecretScan:          "Secret",
		utils.NEO4JMalwareScan:         "Malware",
		utils.NEO4JComplianceScan:      "Compliance",
		utils.NEO4JCloudComplianceScan: "CloudCompliance",
	}
	ScanResultIDField = map[utils.Neo4jScanType]string{
		utils.NEO4JVulnerabilityScan:   "cve_id",
		utils.NEO4JSecretScan:          "node_id",
		utils.NEO4JMalwareScan:         "node_id",
		utils.NEO4JComplianceScan:      "node_id",
		utils.NEO4JCloudComplianceScan: "node_id",
	}
)

type Cypherable interface {
	NodeType() string
	ExtendedField() string
}

type CypherableAndCategorizable interface {
	Categorizable
	Cypherable
}

type Categorizable interface {
	GetCategory() string
	GetJSONCategory() string
}

func GetCategoryCounts[T Categorizable](entries []T) map[string]int32 {
	res := map[string]int32{}

	if len(entries) == 0 {
		return res
	}

	if entries[0].GetCategory() == "" {
		return res
	}

	for i := range entries {
		res[entries[i].GetCategory()] += 1
	}

	return res
}

func Neo4jGetStringRecord(rec *neo4j.Record, key, defaultVal string) string {
	val, ok := rec.Get(key)
	if ok && val != nil {
		return val.(string)
	}
	return defaultVal
}

func Neo4jGetSliceRecord(rec *neo4j.Record, key string, defaultVal []interface{}) []interface{} {
	val, ok := rec.Get(key)
	if ok && val != nil {
		return val.([]interface{})
	} else {
		return defaultVal
	}
}
