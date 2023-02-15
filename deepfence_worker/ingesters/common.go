package ingesters

import (
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func status_scan_field(ts utils.Neo4jScanType) string {
	switch ts {
	case utils.NEO4J_SECRET_SCAN:
		return "secret_scan_status"
	case utils.NEO4J_VULNERABILITY_SCAN:
		return "vulnerability_scan_status"
	case utils.NEO4J_MALWARE_SCAN:
		return "malware_scan_status"
	case utils.NEO4J_COMPLIANCE_SCAN:
		return "compliance_scan_status"
	case utils.NEO4J_CLOUD_COMPLIANCE_SCAN:
		return "cloud_compliance_scan_status"
	}
	return "unknown"
}

func status_count_field(ts utils.Neo4jScanType) string {
	switch ts {
	case utils.NEO4J_SECRET_SCAN:
		return "secrets_count"
	case utils.NEO4J_VULNERABILITY_SCAN:
		return "vulnerabilities_count"
	case utils.NEO4J_MALWARE_SCAN:
		return "malwares_count"
	case utils.NEO4J_COMPLIANCE_SCAN:
		return "compliances_count"
	case utils.NEO4J_CLOUD_COMPLIANCE_SCAN:
		return "cloud_compliances_count"
	}
	return "unknown"
}

func CommitFuncStatus[Status any](ts utils.Neo4jScanType) func(ns string, data []Status) error {
	return func(ns string, data []Status) error {
		ctx := directory.NewContextWithNameSpace(directory.NamespaceID(ns))
		driver, err := directory.Neo4jClient(ctx)

		if len(data) == 0 {
			return nil
		}

		if err != nil {
			return err
		}

		session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
		if err != nil {
			return err
		}
		defer session.Close()

		tx, err := session.BeginTransaction()
		if err != nil {
			return err
		}
		defer tx.Close()

		if _, err = tx.Run(`
			UNWIND $batch as row
			MERGE (n:`+string(ts)+`{node_id: row.scan_id})
			SET n.status = row.scan_status, n.updated_at = TIMESTAMP()
			WITH n
			MATCH (n) -[:DETECTED]- (m)
			WITH n, count(m) as count
			MATCH (n) -[:SCANNED]- (r)
			SET r.`+status_count_field(ts)+` = count, r.`+status_scan_field(ts)+`=n.scan_status`,
			map[string]interface{}{"batch": statusesToMaps(data)}); err != nil {
			return err
		}

		return tx.Commit()
	}
}

func statusesToMaps[T any](data []T) []map[string]interface{} {
	statuses := []map[string]interface{}{}
	for _, i := range data {
		statuses = append(statuses, utils.ToMap(i))
	}
	return statuses
}
