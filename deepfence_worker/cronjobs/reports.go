package cronjobs

import (
	"context"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const minioReportsPrefix = "/report/"

func CleanUpReports(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	log.Info().Msg("Start reports cleanup")

	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		return err
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}
	defer session.Close(ctx)

	hoursAgo := time.Now().Add(time.Duration(-utils.ReportRetentionTime))

	cleanup := func(pathPrefix string) {
		objects := mc.ListFiles(ctx, pathPrefix, false, 0, true)
		for _, obj := range objects {
			if obj.LastModified.Before(hoursAgo) {
				log.Info().Msgf("remove report %s", obj.Key)
				if err := deleteReport(ctx, session, obj.Key); err != nil {
					log.Error().Err(err).Msgf("failed to remove report node from neo4j %s", obj.Key)
				}
				if err := mc.DeleteFile(ctx, obj.Key, false, minio.RemoveObjectOptions{ForceDelete: true}); err != nil {
					log.Error().Err(err).Msgf("failed to remove report file from minio %s", obj.Key)
				}
			}
		}
	}

	cleanup(minioReportsPrefix)

	// delete the reports which are in failed state
	err = deleteFailedReports(ctx, session)

	log.Info().Msg("Complete reports cleanup")

	return err
}

func deleteReport(ctx context.Context, session neo4j.SessionWithContext, path string) error {

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "cronjobs", "delete-report")
	defer span.End()

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(10*time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	defer tx.Close(ctx)

	query := `MATCH (n:Report{storage_path:$path}) DELETE n`
	vars := map[string]interface{}{"path": path}
	_, err = tx.Run(ctx, query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	return tx.Commit(ctx)
}

func deleteFailedReports(ctx context.Context, session neo4j.SessionWithContext) error {

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "cronjobs", "delete-failed-reports")
	defer span.End()

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(10*time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	defer tx.Close(ctx)

	duration := utils.ReportRetentionTime.Milliseconds()

	query := `MATCH (n:Report) where TIMESTAMP()-n.created_at > $duration DELETE n`
	vars := map[string]interface{}{
		"duration": duration,
	}
	_, err = tx.Run(ctx, query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	return tx.Commit(ctx)
}
