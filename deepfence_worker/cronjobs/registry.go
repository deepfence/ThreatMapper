package cronjobs

import (
	"encoding/json"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry"
	sync "github.com/deepfence/ThreatMapper/deepfence_server/pkg/registrysync"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	postgresql_db "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

func SyncRegistry(msg *message.Message) error {
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	postgresCtx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(postgresCtx)
	if err != nil {
		return err
	}

	var registries []postgresql_db.GetContainerRegistriesRow

	rsp := utils.RegistrySyncParams{}

	if msg.Payload != nil {
		err = json.Unmarshal(msg.Payload, &rsp)
		if err != nil {
			log.Error().Msgf("unable to unmarshal payload: %v", err)
			registries, err = pgClient.GetContainerRegistries(postgresCtx)
			if err != nil {
				return err
			}
		}

		if rsp.PgID != 0 {
			r, err := pgClient.GetContainerRegistry(postgresCtx, rsp.PgID)
			if err != nil {
				return err
			}
			// kludge: marshal and unmarshal back r to postgresql_db.GetContainerRegistriesRow
			rByte, err := json.Marshal(r)
			if err != nil {
				return err
			}
			var getContainerRegistriesRow postgresql_db.GetContainerRegistriesRow
			err = json.Unmarshal(rByte, &getContainerRegistriesRow)
			registries = append(registries, getContainerRegistriesRow)
		}
	} else {
		registries, err = pgClient.GetContainerRegistries(postgresCtx)
		if err != nil {
			return err
		}
	}

	for _, row := range registries {
		r, err := registry.GetRegistryWithRegistryRow(row)
		if err != nil {
			log.Error().Msgf("unable to get registry for %s: %v", row.RegistryType, err)
			continue
		}

		err = sync.SyncRegistry(ctx, pgClient, r, row.ID)
		if err != nil {
			log.Error().Msgf("unable to sync registry: %s: %v", row.RegistryType, err)
			continue
		}
	}
	return nil
}
