package ingesters

import (
	"encoding/json"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

var (
	ScanStatusField = map[utils.Neo4jScanType]string{
		utils.NEO4J_SECRET_SCAN:           "secret_scan_status",
		utils.NEO4J_VULNERABILITY_SCAN:    "vulnerability_scan_status",
		utils.NEO4J_MALWARE_SCAN:          "malware_scan_status",
		utils.NEO4J_COMPLIANCE_SCAN:       "compliance_scan_status",
		utils.NEO4J_CLOUD_COMPLIANCE_SCAN: "cloud_compliance_scan_status",
	}

	LatestScanIdField = map[utils.Neo4jScanType]string{
		utils.NEO4J_SECRET_SCAN:           "secret_latest_scan_id",
		utils.NEO4J_VULNERABILITY_SCAN:    "vulnerability_latest_scan_id",
		utils.NEO4J_MALWARE_SCAN:          "malware_latest_scan_id",
		utils.NEO4J_COMPLIANCE_SCAN:       "compliance_latest_scan_id",
		utils.NEO4J_CLOUD_COMPLIANCE_SCAN: "cloud_compliance_latest_scan_id",
	}

	ScanCountField = map[utils.Neo4jScanType]string{
		utils.NEO4J_SECRET_SCAN:           "secrets_count",
		utils.NEO4J_VULNERABILITY_SCAN:    "vulnerabilities_count",
		utils.NEO4J_MALWARE_SCAN:          "malwares_count",
		utils.NEO4J_COMPLIANCE_SCAN:       "compliances_count",
		utils.NEO4J_CLOUD_COMPLIANCE_SCAN: "cloud_compliances_count",
	}
)

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

		tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
		if err != nil {
			return err
		}
		defer tx.Close()

		query := ""
		switch ts {
		default:
			query = `
			UNWIND $batch as row
			MERGE (n:` + string(ts) + `{node_id: row.scan_id})
			SET n.status = row.scan_status, n.status_message = row.scan_message, n.updated_at = TIMESTAMP()
			WITH n
			OPTIONAL MATCH (n) -[:DETECTED]- (m)
			WITH n, count(m) as count
			MATCH (n) -[:SCANNED]- (r)
			SET r.` + ScanCountField[ts] + `=count, r.` + ScanStatusField[ts] + `=n.status, r.` + LatestScanIdField[ts] + `=n.node_id`
		case utils.NEO4J_CLOUD_COMPLIANCE_SCAN:
			query = `
			UNWIND $batch as row
			MERGE (n:` + string(ts) + `{node_id: row.scan_id})
			SET n.status = row.scan_status, n.status_message = row.scan_message, n.updated_at = TIMESTAMP()
			WITH n
			OPTIONAL MATCH (n) -[:DETECTED]- (m)
			WITH n, count(m) as total_count
			OPTIONAL MATCH (n) -[:DETECTED]- (m)
			WITH  n, total_count, m.resource as arn, count(m) as count
			OPTIONAL MATCH (n) -[:SCANNED]- (cn) -[:OWNS]- (cr:CloudResource{arn: arn})
			SET cn.` + ScanCountField[ts] + `=total_count, cn.` + ScanStatusField[ts] + `=n.status, cn.` + LatestScanIdField[ts] + `=n.node_id
			SET cr.` + ScanCountField[ts] + `=count, cr.` + ScanStatusField[ts] + `=n.status, cr.` + LatestScanIdField[ts] + `=n.node_id`
		}

		if _, err = tx.Run(query, map[string]interface{}{"batch": statusesToMaps(data)}); err != nil {
			log.Error().Msgf("Error while updating scan status: %+v", err)
			return err
		}

		return tx.Commit()

	}
}

// handles status deduplication
// and maintains the order of the messages
func statusesToMaps[T any](data []T) []map[string]interface{} {
	type Entry struct {
		Posn int
		Data map[string]interface{}
	}

	statusBuff := map[string]Entry{}

	index := 0
	for _, i := range data {
		new := ToMap(i)
		scan_id := new["scan_id"].(string)
		new_status := new["scan_status"].(string)

		old, found := statusBuff[scan_id]
		if !found {
			statusBuff[scan_id] = Entry{index, new}
			index++
		} else {
			old_status := old.Data["scan_status"].(string)
			if new_status != old_status {
				if new_status == utils.SCAN_STATUS_SUCCESS || new_status == utils.SCAN_STATUS_FAILED {
					statusBuff[scan_id] = Entry{old.Posn, new}
				}
			}
		}
	}

	statuses := make([]map[string]interface{}, len(statusBuff))
	for _, v := range statusBuff {
		statuses[v.Posn] = v.Data
	}

	return statuses
}

func ToMap[T any](data T) map[string]interface{} {
	out, err := json.Marshal(data)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	_ = json.Unmarshal(out, &bb)
	return bb
}
