package cronjobs

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry"
	sync "github.com/deepfence/ThreatMapper/deepfence_server/pkg/registrysync"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
)

func SyncRegistry(ctx context.Context, task *asynq.Task) error {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("unable to get postgres client: %v", err)
		return nil
	}

	var registries []postgresql_db.GetContainerRegistriesRow

	rsp := utils.RegistrySyncParams{}

	if task.Payload() != nil {
		err = json.Unmarshal(task.Payload(), &rsp)
		if err != nil {
			log.Warn().Msgf("unable to unmarshal payload: %v, error: %v syncing all registries...", task.Payload(), err)
			registries, err = pgClient.GetContainerRegistries(ctx)
			if err != nil {
				log.Error().Msgf("unable to get registries: %v", err)
				return nil
			}
		}

		if rsp.PgID != 0 {
			r, err := pgClient.GetContainerRegistry(ctx, rsp.PgID)
			if err != nil {
				log.Error().Msgf("unable to get registry: %v", err)
				return nil
			}
			// kludge: marshal and unmarshal back r to postgresql_db.GetContainerRegistriesRow
			rByte, err := json.Marshal(r)
			if err != nil {
				log.Error().Msgf("unable to marshal registry: %v", err)
				return nil
			}
			var getContainerRegistriesRow postgresql_db.GetContainerRegistriesRow
			err = json.Unmarshal(rByte, &getContainerRegistriesRow)
			if err != nil {
				log.Error().Msgf("unable to unmarshal registry: %v", err)
				return nil
			}
			registries = append(registries, getContainerRegistriesRow)
		}
	} else {
		registries, err = pgClient.GetContainerRegistries(ctx)
		if err != nil {
			log.Error().Msgf("unable to get registries: %v", err)
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
			log.Error().Msgf("unable to sync registry: %s (%s): %v", row.RegistryType, row.Name, err)
			continue
		}
	}
	return nil
}
