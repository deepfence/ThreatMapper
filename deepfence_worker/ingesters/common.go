package ingesters

import (
	"encoding/json"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/scans"
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

		if ts != utils.NEO4J_COMPLIANCE_SCAN {
			worker, err := directory.Worker(ctx)
			if err != nil {
				return err
			}

			event := scans.UpdateScanEvent{
				ScanType:  ts,
				RecordMap: recordMap,
			}
			b, err := json.Marshal(event)
			if err != nil {
				return err
			}
			task := utils.UpdatePodScanStatusTask
			if ts == utils.NEO4J_CLOUD_COMPLIANCE_SCAN {
				task = utils.UpdateCloudResourceScanStatusTask
			}
			err = worker.Enqueue(task, b)
		}

		return err
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
