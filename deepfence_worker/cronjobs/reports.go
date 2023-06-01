package cronjobs

import (
	"context"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const minioReportsPrefix = "/report/"

func CleanUpReports(msg *message.Message) error {
	log.Info().Msg("Start reports cleanup")
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	mc, err := directory.MinioClient(ctx)
	if err != nil {
		return err
	}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}
	defer session.Close()

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

	log.Info().Msg("Complete reports cleanup")

	return nil
}

func deleteReport(ctx context.Context, session neo4j.Session, path string) error {
	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(10 * time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	defer tx.Close()

	query := `MATCH (n:Report{storage_path:$path}) DELETE n`
	vars := map[string]interface{}{"path": path}
	_, err = tx.Run(query, vars)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	return tx.Commit()
}
