package cronjobs

import (
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
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
