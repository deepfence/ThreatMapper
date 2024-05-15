package cronjobs

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/hibiken/asynq"
)

// CleanUpPostgresDB Delete expired user invites and password reset requests
func CleanUpPostgresDB(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}

	err = pgClient.DeletePasswordResetByExpiry(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	err = pgClient.DeleteUserInviteByExpiry(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	// delete audit logs older than 30days
	deleted, err := pgClient.DeleteAuditLogsOlderThan30days(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	log.Info().Msgf("deleted %d audit logs which were older than 30days", deleted)

	return nil
}
