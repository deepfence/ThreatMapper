package threatintel

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
)

func UpdateDeepfenceCommunication(ctx context.Context, messages []DeepfenceCommunicationMessage) error {

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get db connection")
		return err
	}

	for _, message := range messages {
		_, err = pgClient.UpsertDeepfenceCommunication(ctx, postgresql_db.UpsertDeepfenceCommunicationParams{
			ID:            message.ID,
			Title:         message.Title,
			Content:       message.Content,
			Link:          message.Link,
			LinkTitle:     message.LinkTitle,
			ButtonContent: message.ButtonContent,
		})
		if err != nil {
			log.Error().Err(err).Msg("failed to update Deepfence communication")
			continue
		}
	}

	return nil
}
