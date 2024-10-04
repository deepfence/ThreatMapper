package notification

import (
	"context"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// GetRegistrySync returns the registries that are syncing
func GetRegistrySync(ctx context.Context) ([]model.RegistryAccount, error) {
	registries := []model.RegistryAccount{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return registries, err
	}

	log.Info().Msgf("Getting registries that are syncing")

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return registries, err
	}
	defer tx.Close(ctx)
	query := `
		MATCH (r:RegistryAccount)
		WHERE r.syncing = true
		RETURN r.name, r.node_id, r.registry_type, r.syncing
	`
	log.Debug().Msgf("Query: %s", query)
	result, err := tx.Run(ctx, query, map[string]interface{}{})
	if err != nil {
		return registries, err
	}

	rec, err := result.Collect(ctx)
	if err != nil {
		return registries, err
	}

	if len(rec) == 0 {
		return registries, nil
	}

	for _, record := range rec {
		reg := model.RegistryAccount{}
		reg.Name = record.Values[0].(string)
		reg.ID = record.Values[1].(string)
		reg.RegistryType = record.Values[2].(string)
		reg.Syncing = record.Values[3].(bool)
		registries = append(registries, reg)
	}

	return registries, nil
}
