package reporters

import (
	"errors"

	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

var (
	NotFoundErr        = errors.New("Resource not found")
	ScanResultMaskNode = map[utils.Neo4jScanType]string{
		utils.NEO4J_VULNERABILITY_SCAN:    "VulnerabilityStub",
		utils.NEO4J_SECRET_SCAN:           "Secret",
		utils.NEO4J_MALWARE_SCAN:          "Malware",
		utils.NEO4J_COMPLIANCE_SCAN:       "Compliance",
		utils.NEO4J_CLOUD_COMPLIANCE_SCAN: "CloudCompliance",
	}
	ScanResultIDField = map[utils.Neo4jScanType]string{
		utils.NEO4J_VULNERABILITY_SCAN:    "cve_id",
		utils.NEO4J_SECRET_SCAN:           "node_id",
		utils.NEO4J_MALWARE_SCAN:          "node_id",
		utils.NEO4J_COMPLIANCE_SCAN:       "node_id",
		utils.NEO4J_CLOUD_COMPLIANCE_SCAN: "node_id",
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
	GetJsonCategory() string
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
