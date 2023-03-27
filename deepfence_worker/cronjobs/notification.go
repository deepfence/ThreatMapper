package cronjobs

import (
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

func SendNotifications(msg *message.Message) error {

	postgresCtx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(postgresCtx)
	if err != nil {
		return err
	}

	integrations, err := pgClient.GetIntegrations(postgresCtx)
	if err != nil {
		return err
	}

	for _, row := range integrations {
		log.Error().Msgf("Processing for integration : +%v", row, err)
	}
	return nil
}
