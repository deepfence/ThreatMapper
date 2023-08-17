package ingesters

import (
	"encoding/json"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
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
			SET r.` + ingestersUtil.ScanCountField[ts] + `=count, r.` + ingestersUtil.ScanStatusField[ts] + `=n.status, r.` + ingestersUtil.LatestScanIdField[ts] + `=n.node_id`
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
			SET cn.` + ingestersUtil.ScanCountField[ts] + `=total_count, cn.` + ingestersUtil.ScanStatusField[ts] + `=n.status, cn.` + ingestersUtil.LatestScanIdField[ts] + `=n.node_id
			SET cr.` + ingestersUtil.ScanCountField[ts] + `=count, cr.` + ingestersUtil.ScanStatusField[ts] + `=n.status, cr.` + ingestersUtil.LatestScanIdField[ts] + `=n.node_id`
		}

		if _, err = tx.Run(query, map[string]interface{}{"batch": statusesToMaps(data)}); err != nil {
			log.Error().Msgf("Error while updating scan status: %+v", err)
			return err
		}

		return tx.Commit()
	}
}

// also handles status deduplication
func statusesToMaps[T any](data []T) []map[string]interface{} {
	statusBuff := map[string]map[string]interface{}{}
	for _, i := range data {
		new := ToMap(i)
		scan_id := new["scan_id"].(string)
		new_status := new["scan_status"].(string)

		old, found := statusBuff[scan_id]
		if !found {
			statusBuff[scan_id] = new
		} else {
			old_status := old["scan_status"].(string)
			if new_status != old_status {
				if new_status == utils.SCAN_STATUS_SUCCESS || new_status == utils.SCAN_STATUS_FAILED {
					statusBuff[scan_id] = new
				}
			}
		}
	}

	statuses := []map[string]interface{}{}
	for _, v := range statusBuff {
		statuses = append(statuses, v)
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
