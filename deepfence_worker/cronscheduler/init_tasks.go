package cronscheduler

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/vulnerability_db"
)

func initDatabase(ctx context.Context) {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get db client")
		return
	}

	err = model.InitializeScheduledTasks(ctx, pgClient)
	if err != nil {
		log.Error().Err(err).Msg("failed to initialize scheduled tasks")
	}

	err = model.SetScanResultsDeletionSetting(ctx, pgClient)
	if err != nil {
		log.Error().Err(err).Msg("failed to update settings")
	}
}

func initMinio() error {
	ctx := directory.NewContextWithNameSpace("database")
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	if err := mc.CreatePublicBucket(ctx); err != nil {
		log.Error().Err(err).Msgf("failed to create bucket")
		return err
	}

	// download database once on init
	vulnerability_db.DownloadDatabase()

	return nil
}
