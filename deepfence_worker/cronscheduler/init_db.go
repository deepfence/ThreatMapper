package cronscheduler

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/pressly/goose/v3"
)

const migrationsPath = "/usr/local/postgresql-migrate"

func applyDatabaseMigrations(ctx context.Context) error {

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "cronjobs", "apply-sql-db-migration")
	defer span.End()

	log.Info().Msg("apply database migrations")
	defer log.Info().Msg("complete database migrations")

	conn, err := directory.NewSQLConnection(ctx)
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

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "cronjobs", "init-sql-database")
	defer span.End()

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

	_, err = model.GetSettingByKey(ctx, pgClient, model.FileServerURLSettingKey)
	if err != nil {
		// FileServerURLSetting is not set
		// Copy ConsoleURLSetting to FileServerURLSetting
		consoleURLSetting, err := model.GetSettingByKey(ctx, pgClient, model.ConsoleURLSettingKey)
		// Skip if ConsoleURLSetting is not set
		if err == nil {
			fileServerURLSetting := model.Setting{
				Key: model.FileServerURLSettingKey,
				Value: &model.SettingValue{
					Label:       utils.FileServerURLSettingLabel,
					Value:       consoleURLSetting.Value.Value,
					Description: utils.FileServerURLSettingDescription,
				},
				IsVisibleOnUI: true,
			}
			_, err = fileServerURLSetting.Create(ctx, pgClient)
			if err != nil {
				log.Error().Err(err).Msg("failed to set FileServerURLSetting")
			}
		}
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

func InitMinioDatabase() {
	ctx := directory.NewContextWithNameSpace("database")
	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}
	retries := 3
	for {
		if err := mc.CreatePublicBucket(ctx, directory.FileServerDatabaseBucket); err != nil {
			log.Error().Err(err).Msgf("failed to create bucket")
			retries -= 1
			if retries != 0 {
				continue
			}
			// donot continue we need this step succesfull
			panic(err)
		}
		break
	}
}
