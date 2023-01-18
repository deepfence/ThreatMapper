package cronjobs

import (
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"time"
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
		return err
	}

	err = pgClient.DeletePasswordResetByExpiry(ctx, ts)
	if err != nil {
		return err
	}

	err = pgClient.DeleteUserInviteByExpiry(ctx, ts)
	if err != nil {
		return err
	}

	return nil
}
