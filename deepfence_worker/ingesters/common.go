package ingesters

import (
	"encoding/json"
	"strconv"
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
			r.` + ingestersUtil.LatestScanIDField[ts] + `=n.node_id,
			r.` + ingestersUtil.ScanCountField[ts] + `=m_count`

		recordMap := statusesToMaps(data)
		in_progress, others := splitInprogressStatus(recordMap)
		if len(in_progress) > 0 {
			log.Debug().Msgf("query: %v", query)
			if _, err = tx.Run(query, map[string]interface{}{
				"batch":         in_progress,
				"cancel_states": []string{utils.ScanStatusCancelling, utils.ScanStatusCancelPending}}); err != nil {
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

		worker, err := directory.Worker(ctx)
		if err != nil {
			return err
		}

		if ts != utils.NEO4JComplianceScan {
			event := scans.UpdateScanEvent{
				ScanType:  ts,
				RecordMap: recordMap,
			}
			b, err := json.Marshal(event)
			if err != nil {
				return err
			}
			task := utils.UpdatePodScanStatusTask
			if ts == utils.NEO4JCloudComplianceScan {
				task = utils.UpdateCloudResourceScanStatusTask
			}
			if err := worker.Enqueue(task, b, utils.DefaultTaskOpts()...); err != nil {
				log.Error().Err(err).Msgf("failed to enqueue %s", task)
			}
		}

		if (ts == utils.NEO4JComplianceScan || ts == utils.NEO4JCloudComplianceScan) && anyCompleted(others) {
			err := worker.Enqueue(utils.CachePostureProviders,
				[]byte(strconv.FormatInt(utils.GetTimestamp(), 10)), utils.CritialTaskOpts()...)
			if err != nil {
				log.Error().Err(err).Msgf("failed to enqueue %s", utils.CachePostureProviders)
			}
		}

		return err
	}
}

// also handles status deduplication
func statusesToMaps[T any](data []T) []map[string]interface{} {
	statusBuff := map[string]map[string]interface{}{}
	for _, i := range data {
		new := ToMap(i)

		scan_id, ok := new["scan_id"].(string)
		if !ok {
			log.Error().Msgf("failed to convert scan_id to string, data: %v", new)
			continue
		}

		new_status, ok := new["scan_status"].(string)
		if !ok {
			log.Error().Msgf("failed to convert scan_status to string, data: %v", new)
			continue
		}

		old, found := statusBuff[scan_id]
		if !found {
			statusBuff[scan_id] = new
		} else {
			old_status, ok := old["scan_status"].(string)
			if !ok {
				log.Error().Msgf("failed to convert scan_status to string, data: %v", old)
				continue
			}
			if new_status != old_status {
				if new_status == utils.ScanStatusSuccess ||
					new_status == utils.ScanStatusFailed || new_status == utils.ScanStatusCancelled {
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
		status, ok := data[i]["scan_status"].(string)
		if !ok {
			log.Error().Msgf("failed to convert scan_status to string, data: %v", data[i])
			continue
		}

		if status == utils.ScanStatusInProgress {
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

func anyCompleted(data []map[string]interface{}) bool {

	complete := false

	for i := range data {
		status, ok := data[i]["scan_status"].(string)
		if !ok {
			log.Error().Msgf("failed to convert scan_status to string, data: %v", data[i])
			continue
		}

		if status == utils.ScanStatusSuccess {
			complete = true
			break
		}
	}

	return complete
}

func getEntityIdFromScanID(scanId, scanType string,
	tx neo4j.Transaction) (string, error) {

	entityId := ""
	query := `MATCH (s:` + scanType + `{node_id:'` + scanId + `'}) - [:SCANNED] -> (n)
		WITH labels(n) as label, n
		RETURN 
		CASE 
    		WHEN 'ContainerImage' IN label or 'Container' in label 
			THEN [(ci:ContainerImage{node_id:n.docker_image_id}) - [:IS] -> (cis) | cis.node_id] 
    		ELSE [n.node_id]
		END`
	res, err := tx.Run(query, map[string]interface{}{})
	if err != nil {
		return "", err
	}

	rec, err := res.Single()
	if err != nil {
		return "", err
	}

	values := rec.Values[0].([]interface{})
	if len(values) > 0 {
		entityId = values[0].(string)
	}

	if len(entityId) == 0 {
		entityId = scanId
	}

	return entityId, nil
}
