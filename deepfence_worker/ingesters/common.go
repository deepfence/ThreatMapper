package ingesters

import (
	"encoding/json"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
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

		tx, err := session.BeginTransaction()
		if err != nil {
			return err
		}
		defer tx.Close()

		if _, err = tx.Run(`
			UNWIND $batch as row
			MERGE (n:`+string(ts)+`{node_id: row.scan_id})
			SET n.status = row.scan_status, n.scan_message = row.scan_message, n.updated_at = TIMESTAMP()`,
			map[string]interface{}{"batch": statusesToMaps(data)}); err != nil {
			log.Error().Msgf("Error while updating scan status: %+v", err)
			return err
		}

		return tx.Commit()
	}
}

func statusesToMaps[T any](data []T) []map[string]interface{} {
	statuses := []map[string]interface{}{}
	for _, i := range data {
		statuses = append(statuses, ToMap(i))
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
