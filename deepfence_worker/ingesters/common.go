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

		recordMap := statusesToMaps(data)
		if _, err = tx.Run(query, map[string]interface{}{"batch": statusesToMaps(data)}); err != nil {
			log.Error().Msgf("Error while updating scan status: %+v", err)
			return err
		}

		if ts != utils.NEO4J_CLOUD_COMPLIANCE_SCAN && ts != utils.NEO4J_COMPLIANCE_SCAN {
			err = updatePodScanStatus(ts, recordMap, tx)
			if err != nil {
				return err
			}
		}

		err = tx.Commit()
		if err != nil {
			return err
		}

		return nil
	}
}

func updatePodScanStatus(ts utils.Neo4jScanType,
	recordMap []map[string]interface{}, tx neo4j.Transaction) error {

	query := `
		UNWIND $batch as row
		MATCH (s:` + string(ts) + `{node_id: row.scan_id})-[:SCANNED]->(c:Container)
		WHERE c.pod_id IS NOT NULL
		MATCH (n:Pod{node_id: c.pod_id})
		SET n.` + ingestersUtil.ScanStatusField[ts] + `=row.scan_status`

	log.Debug().Msgf("query: %v", query)
	_, err := tx.Run(query,
		map[string]interface{}{
			"batch": recordMap,
		},
	)

	if err != nil {
		log.Error().Msgf("Error in pod status update query: %+v", err)
		return err
	}

	return nil
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
