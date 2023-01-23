package registrysync

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"

	commonConstants "github.com/deepfence/ThreatMapper/deepfence_server/constants/common"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	// "github.com/deepfence/ThreatMapper/deepfence_utils/directory"
)

// read from postgres -- getAllRegistries()
// create registry instance --
// fetch image using method in instance
// update neo4j

// todo: move to utils!
func getAESValueForEncryption(ctx context.Context, pgClient *postgresqlDb.Queries) (json.RawMessage, error) {
	s := model.Setting{}
	aes, err := s.GetSettingByKey(ctx, pgClient, commonConstants.AES_SECRET)
	if err != nil {
		return nil, err
	}
	var sValue model.SettingValue
	err = json.Unmarshal(aes.Value, &sValue)
	if err != nil {
		return nil, err
	}

	b, err := json.Marshal(sValue.Value)
	if err != nil {
		return nil, err
	}

	return json.RawMessage(b), nil
}

func Sync() error {
	postgresCtx := directory.NewGlobalContext()
	ctx := directory.NewContextWithNameSpace(directory.NonSaaSDirKey)
	pgClient, err := directory.PostgresClient(postgresCtx)
	if err != nil {
		return err
	}
	registries, err := pgClient.GetContainerRegistries(postgresCtx)
	if err != nil {
		return err
	}

	for _, registryRow := range registries {
		b, err := json.Marshal(registryRow)
		if err != nil {
			log.Error().Msgf("unable to marshal: %v", err)
			continue
		}

		log.Info().Msgf("reg: +%v", string(b))
		r, err := registry.GetRegistryWithRegistryRow(registryRow)
		if err != nil {
			log.Error().Msgf("unable to get registry for %s: %v", registryRow.RegistryType, err)
			continue
		}

		err = SyncRegistry(ctx, pgClient, r)
		if err != nil {
			log.Error().Msgf("unable to get sync registry: %s: %v", registryRow.RegistryType, err)
			continue
		}
	}
	return nil
}

func SyncRegistry(ctx context.Context, pgClient *postgresqlDb.Queries, r registry.Registry) error {

	// decrypt secret
	aesValue, err := getAESValueForEncryption(ctx, pgClient)
	if err != nil {
		return err
	}

	// note: we'll decrypt the secret in registry interface object
	aes := encryption.AES{}
	err = json.Unmarshal(aesValue, &aes)
	if err != nil {
		return err
	}

	err = r.DecryptSecret(aes)
	if err != nil {
		return err
	}

	list, err := r.FetchImagesFromRegistry()
	if err != nil {
		return err
	}
	return injestToNeo4j(ctx, list)
}

// func startSync() {
// 	ticker := time.NewTicker(24 * time.Hour)

// 	cron("*****", sync)
// }

// func injestToNeo4j(r model.RegistryImages) error {
// 	ctx := directory.NewGlobalContext()
// 	driver, err  := directory.Neo4jClient(ctx)
// 	if err != nil {
// 		return err
// 	}

// 	session, err := driver.Session(neo4j.AccessModeWrite)
// 	if err != nil {
// 		return err
// 	}
// 	defer session.Close()

// 	tx, err := session.BeginTransaction()
// 	if err != nil {
// 		return err
// 	}

// 	return nil
// }

func injestToNeo4j(ctx context.Context, r model.RegistryImages) error {
	log.Info().Msgf("injest this to neo4j +%v", r)
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	results := r.Results
	ritm := RegistryImagesToMaps(results)
	log.Info().Msgf("xxxxxxxxx: %+v", ritm)

	if _, err := tx.Run("UNWIND $batch as row MERGE (n:ContainerImage{node_id: row.name}) SET n.updated_at = TIMESTAMP()",
		map[string]interface{}{"batch": ritm}); err != nil {
		return err
	}

	return nil
}

func RegistryImagesToMaps(ms []model.RegistryImage) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, utils.ToMap(v))
	}
	return res
}
