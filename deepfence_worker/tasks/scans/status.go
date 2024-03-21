package scans

import (
	"context"
	"encoding/json"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"

	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
)

type UpdateScanEvent struct {
	ScanType  utils.Neo4jScanType
	RecordMap []map[string]interface{}
}

func UpdatePodScanStatus(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	var event UpdateScanEvent
	err := json.Unmarshal(task.Payload(), &event)
	if err != nil {
		return err
	}

	log.Info().Msgf("Update pod scan status")
	defer log.Info().Msgf("Update pod scan status done")

	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	// TODO: Take into account all containers, not just last one
	query := `
		UNWIND $batch as row
		MATCH (s:` + string(event.ScanType) + `{node_id: row.scan_id})-[:SCANNED]->(c:Container)
		WHERE c.pod_id IS NOT NULL
		MATCH (n:Pod{node_id: c.pod_id})
		SET n.` + ingestersUtil.ScanStatusField[event.ScanType] + `=s.status`

	log.Debug().Msgf("query: %v", query)
	_, err = session.Run(ctx, query,
		map[string]interface{}{
			"batch": event.RecordMap,
		},
		neo4j.WithTxTimeout(30*time.Second),
	)

	if err != nil {
		log.Error().Msgf("Error in pod status update query: %+v", err)
		return err
	}

	return nil
}

func UpdateCloudResourceScanStatus(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	var event UpdateScanEvent
	err := json.Unmarshal(task.Payload(), &event)
	if err != nil {
		return err
	}

	log.Info().Msgf("Update cloud resource scan status")
	defer log.Info().Msgf("Update cloud resource scan status done")

	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	query := `
		UNWIND $batch as row
		MATCH (n:` + string(event.ScanType) + `{node_id: row.scan_id}) -[:DETECTED]- (m)
		WITH  m.resource as arn, count(m) as count, n.status as status, n.node_id as scan_id
		MATCH (cr:CloudResource{arn: arn})
		SET cr.` + ingestersUtil.ScanCountField[event.ScanType] + `=count,
			cr.` + ingestersUtil.ScanStatusField[event.ScanType] + `=status,
			cr.` + ingestersUtil.LatestScanIDField[event.ScanType] + `=scan_id`

	log.Debug().Msgf("query: %v", query)
	_, err = session.Run(ctx, query,
		map[string]interface{}{
			"batch": event.RecordMap,
		},
		neo4j.WithTxTimeout(30*time.Second),
	)

	if err != nil {
		log.Error().Msgf("Error in cloud resource status update query: %+v", err)
		return err
	}

	return nil
}
