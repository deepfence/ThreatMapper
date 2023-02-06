package cronjobs

import (
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry"
	sync "github.com/deepfence/ThreatMapper/deepfence_server/pkg/registrysync"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

func SyncRegistry(msg *message.Message) error {
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	postgresCtx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(postgresCtx)
	if err != nil {
		return err
	}

	registries, err := pgClient.GetContainerRegistries(postgresCtx)
	if err != nil {
		return err
	}

	for _, registryRow := range registries {
		r, err := registry.GetRegistryWithRegistryRow(registryRow)
		if err != nil {
			log.Error().Msgf("unable to get registry for %s: %v", registryRow.RegistryType, err)
			continue
		}

		err = sync.SyncRegistry(ctx, pgClient, r)
		if err != nil {
			log.Error().Msgf("unable to get sync registry: %s: %v", registryRow.RegistryType, err)
			continue
		}
	}
	return nil
}
