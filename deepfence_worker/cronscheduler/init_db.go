package cronscheduler

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/vulnerability_db"
	"github.com/pressly/goose/v3"
)

const migrationsPath = "/usr/local/postgresql-migrate"

func applyDatabaseMigrations(ctx context.Context) error {

	log.Info().Msg("apply database migrations")
	defer log.Info().Msg("complete database migrations")

	conn, err := directory.NewSqlConnection(ctx)
	if err != nil {
		return err
	}
	defer conn.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}

	goose.SetVerbose(true)

	if err := goose.Up(conn, migrationsPath, goose.WithAllowMissing()); err != nil {
		return err
	}

	return nil
}

func initSqlDatabase(ctx context.Context) error {
	// apply database migrations first
	err := applyDatabaseMigrations(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to apply db migrations")
		return err
	}

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get db client")
		return err
	}

	err = model.InitializeScheduledTasks(ctx, pgClient)
	if err != nil {
		log.Error().Err(err).Msg("failed to initialize scheduled tasks")
	}

	err = model.SetScanResultsDeletionSetting(ctx, pgClient)
	if err != nil {
		log.Error().Err(err).Msg("failed to update settings")
	}

	err = model.SetConsoleIDSetting(ctx, pgClient)
	if err != nil {
		log.Error().Err(err).Msg("failed to initialize console id")
	}

	err = model.InitializeAESSetting(ctx, pgClient)
	if err != nil {
		log.Error().Err(err).Msg("failed to initialize aes")
	}

	return nil
}

func InitMinioDatabase() error {
	ctx := directory.NewContextWithNameSpace("database")
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	retries := 3
	for {
		if err := mc.CreatePublicBucket(ctx, directory.MinioDatabaseBucket); err != nil {
			log.Error().Err(err).Msgf("failed to create bucket")
			retries -= 1
			if retries != 0 {
				continue
			}
			return err
		}
		break
	}

	// download vulnerability database once on init
	vulnerability_db.DownloadDatabase()

	return nil
}
