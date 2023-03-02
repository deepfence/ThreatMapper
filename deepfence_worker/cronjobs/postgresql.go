package cronjobs

import (
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

// CleanUpPostgresDB Delete expired user invites and password reset requests
func CleanUpPostgresDB(msg *message.Message) error {
	//namespace := msg.Metadata.Get(directory.NamespaceKey)
	//ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}
	dateTime := string(msg.Payload)
	ts, err := time.Parse("2006-01-02T15:04:05.999Z", dateTime)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	err = pgClient.DeletePasswordResetByExpiry(ctx, ts)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	err = pgClient.DeleteUserInviteByExpiry(ctx, ts)
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
