package cronscheduler

import (
	"context"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/minio/minio-go/v7"
	"github.com/pressly/goose/v3"
)

const (
	migrationsPath = "/usr/local/postgresql-migrate"
	agentBinaryDir = "/opt/deepfence"
)

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

	fileServerURLSetting, err := model.GetSettingByKey(ctx, pgClient, model.FileServerURLSettingKey)
	if err == nil {
		err = fileServerURLSetting.Delete(ctx, pgClient)
		if err != nil {
			log.Error().Err(err).Msg("failed to delete FileServerURLSettingKey")
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

func InitFileServerDatabase() {
	ctx := directory.NewContextWithNameSpace(directory.DatabaseDirKey)
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
			// do not continue, we need this step successful
			panic(err)
		}
		break
	}

	// Add agent binaries to file server
	err = filepath.Walk(agentBinaryDir,
		func(fileName string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.Mode().IsRegular() || strings.HasPrefix(info.Name(), ".") {
				return nil
			}

			dbFileName := path.Join(utils.FileServerPathAgentBinary, info.Name())
			_, err = mc.UploadLocalFile(ctx, dbFileName, fileName, true, minio.PutObjectOptions{})
			if err != nil {
				return err
			}

			return nil
		},
	)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}
