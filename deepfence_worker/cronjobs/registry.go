package cronjobs

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry"
	sync "github.com/deepfence/ThreatMapper/deepfence_server/pkg/registrysync"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func SyncRegistry(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

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
			log.Warn().Msgf("unable to unmarshal payload: %v, error: %v syncing all registries...", string(task.Payload()), err)
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
			return err
		}
	}

	return syncRegistry(ctx, pgClient, registries)
}

func syncRegistry(ctx context.Context, pgClient *postgresql_db.Queries, registries []postgresql_db.GetContainerRegistriesRow) error {

	log := log.WithCtx(ctx)

	enqueuer, err := directory.Worker(ctx)
	if err != nil {
		return err
	}

	toRetry := []int32{}
	for _, row := range registries {
		r, err := registry.GetRegistryWithRegistryRow(row)
		if err != nil {
			log.Error().Msgf("unable to get registry for %s: %v", row.RegistryType, err)
			continue
		}

		err = sync.SyncRegistry(ctx, pgClient, r, row)
		if err != nil {
			log.Error().Msgf("unable to sync registry: %s (%s): %v", row.RegistryType, row.Name, err)
			toRetry = append(toRetry, row.ID)
			continue
		}
	}

	for i := range toRetry {
		payload, err := json.Marshal(utils.RegistrySyncParams{
			PgID: toRetry[i],
		})
		if err != nil {
			log.Error().Msgf("unable to retry sync registry: %v", err)
		}
		enqueuer.Enqueue(utils.SyncRegistryTask, payload)
	}
	return nil
}

// SyncRegistryPostgresNeo4jTask Synchronize registry between postgres and neo4j
func SyncRegistryPostgresNeo4jTask(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("unable to get postgres client: %v", err)
		return nil
	}

	var registries []postgresql_db.GetContainerRegistriesRow
	registriesByID := make(map[string]postgresql_db.GetContainerRegistriesRow)

	registries, err = pgClient.GetContainerRegistries(ctx)
	if err != nil {
		log.Error().Msgf("unable to get registries: %v", err)
	}

	pgRegistryIDs := make(map[string]bool)
	for _, row := range registries {
		reg, err := registry.GetRegistryWithRegistryRow(row)
		if err != nil {
			log.Error().Err(err).Msgf("Fail to unmarshal registry from DB")
			continue
		}
		registryID := utils.GetRegistryID(reg.GetRegistryType(), reg.GetNamespace(), row.ID)
		pgRegistryIDs[registryID] = true
		registriesByID[registryID] = row
	}

	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(15*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	query := "MATCH (n:RegistryAccount) RETURN n.node_id"

	res, err := tx.Run(ctx, query, map[string]interface{}{})
	if err != nil {
		return err
	}

	recs, err := res.Collect(ctx)
	if err != nil {
		return err
	}

	neo4jRegistryIDs := make(map[string]bool)
	for _, rec := range recs {
		neo4jRegistryIDs[fmt.Sprintf("%v", rec.Values[0])] = true
	}

	// Registry ID present in neo4j but not in postgres has to be deleted
	var deleteRegistryIDs []string
	for id, _ := range neo4jRegistryIDs {
		if pgRegistryIDs[id] == false {
			deleteRegistryIDs = append(deleteRegistryIDs, id)
		}
	}

	err = model.DeleteRegistryAccount(ctx, deleteRegistryIDs)
	if err != nil {
		return err
	}

	// Registry ID present in postgres but not in neo4j has to be synchronized
	var syncRegistries []postgresql_db.GetContainerRegistriesRow
	for id, _ := range pgRegistryIDs {
		if neo4jRegistryIDs[id] == false {
			syncRegistries = append(syncRegistries, registriesByID[id])
		}
	}

	syncRegistry(ctx, pgClient, syncRegistries)

	return nil
}
