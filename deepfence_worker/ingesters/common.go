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

		query := `
		UNWIND $batch as row
		MATCH (n:` + string(ts) + `{node_id: row.scan_id})
		WHERE NOT n.status IN $cancel_states
		SET n.status = row.scan_status,
			n.status_message = row.scan_message,
			n.updated_at = TIMESTAMP()
		WITH n
		OPTIONAL MATCH (m) -[:DETECTED]- (n)
		WITH n, count(m) as m_count
		MATCH (n) -[:SCANNED]- (r)
		SET r.` + ingestersUtil.ScanStatusField[ts] + `=n.status,
			r.` + ingestersUtil.LatestScanIdField[ts] + `=n.node_id,
			r.` + ingestersUtil.ScanCountField[ts] + `=m_count`

		recordMap := statusesToMaps(data)
		in_progress, others := splitInprogressStatus(recordMap)
		if len(in_progress) > 0 {
			log.Debug().Msgf("query: %v", query)
			if _, err = tx.Run(query, map[string]interface{}{
				"batch":         in_progress,
				"cancel_states": []string{utils.SCAN_STATUS_CANCELLING, utils.SCAN_STATUS_CANCEL_PENDING}}); err != nil {
				log.Error().Msgf("Error while updating scan status: %+v", err)
				return err
			}
		}

		if len(others) > 0 {
			log.Debug().Msgf("query: %v", query)
			if _, err = tx.Run(query, map[string]interface{}{
				"batch":         others,
				"cancel_states": []string{}}); err != nil {
				log.Error().Msgf("Error while updating scan status: %+v", err)
				return err
			}
		}

		err = tx.Commit()
		if err != nil {
			return err
		}

		if ts == utils.NEO4J_CLOUD_COMPLIANCE_SCAN {
			err = updateCloudResourceScanStatus(ts, recordMap, session)
		} else if ts != utils.NEO4J_COMPLIANCE_SCAN {
			err = updatePodScanStatus(ts, recordMap, session)
		}

		return err
	}
}

// TODO: move to a specific task
func updatePodScanStatus(ts utils.Neo4jScanType,
	recordMap []map[string]interface{}, session neo4j.Session) error {

	// TODO: Take into account all containers, not just last one
	query := `
		UNWIND $batch as row
		MATCH (s:` + string(ts) + `{node_id: row.scan_id})-[:SCANNED]->(c:Container)
		WHERE c.pod_id IS NOT NULL
		MATCH (n:Pod{node_id: c.pod_id})
		SET n.` + ingestersUtil.ScanStatusField[ts] + `=row.scan_status`

	log.Debug().Msgf("query: %v", query)
	_, err := session.Run(query,
		map[string]interface{}{
			"batch": recordMap,
		},
		neo4j.WithTxTimeout(30*time.Second),
	)

	if err != nil {
		log.Error().Msgf("Error in pod status update query: %+v", err)
		return err
	}

	return nil
}

// TODO: move to a specific task
func updateCloudResourceScanStatus(ts utils.Neo4jScanType,
	recordMap []map[string]interface{}, session neo4j.Session) error {

	query := `
		UNWIND $batch as row
		MATCH (n:` + string(ts) + `{node_id: row.scan_id}) -[:DETECTED]- (m)
		WITH  m.resource as arn, count(m) as count, n.status as status, n.node_id as scan_id
		MATCH (cr:CloudResource{arn: arn})
		SET cr.` + ingestersUtil.ScanCountField[ts] + `=count,
			cr.` + ingestersUtil.ScanStatusField[ts] + `=status,
			cr.` + ingestersUtil.LatestScanIdField[ts] + `=scan_id`

	log.Debug().Msgf("query: %v", query)
	_, err := session.Run(query,
		map[string]interface{}{
			"batch": recordMap,
		},
		neo4j.WithTxTimeout(30*time.Second),
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
				if new_status == utils.SCAN_STATUS_SUCCESS ||
					new_status == utils.SCAN_STATUS_FAILED || new_status == utils.SCAN_STATUS_CANCELLED {
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

func splitInprogressStatus(data []map[string]interface{}) ([]map[string]interface{}, []map[string]interface{}) {
	in_progress := []map[string]interface{}{}
	others := []map[string]interface{}{}

	for i := range data {
		if data[i]["scan_status"].(string) == utils.SCAN_STATUS_INPROGRESS {
			in_progress = append(in_progress, data[i])
		} else {
			others = append(others, data[i])
		}
	}
	return in_progress, others
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
