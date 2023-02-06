package registrysync

import (
	"context"
	"encoding/json"

	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"

	commonConstants "github.com/deepfence/ThreatMapper/deepfence_server/constants/common"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/encryption"
	postgresqlDb "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	// "github.com/deepfence/golang_deepfence_sdk/utils/directory"
)

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
	return insertToNeo4j(ctx, list, r)
}

func insertToNeo4j(ctx context.Context, images []model.ContainerImage, r registry.Registry) error {
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

	imageMap := RegistryImagesToMaps(images)
	registryId := model.GetRegistryID(r.GetRegistryType(), r.GetNamespace())
	_, err = tx.Run(`
	UNWIND $batch as row
	MERGE (n:ContainerImage{node_id:row.node_id})
	MERGE (m:RegistryAccount{node_id: $node_id })
    MERGE (m) -[:HOSTS]-> (n)
	SET n+= row, n.updated_at = TIMESTAMP()`,
		map[string]interface{}{"batch": imageMap, "node_id": registryId})
	if err != nil {
		return err
	}

	return tx.Commit()
}

func RegistryImagesToMaps(ms []model.ContainerImage) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, toMap(v))
	}
	return res
}

func toMap(i model.ContainerImage) map[string]interface{} {
	out, err := json.Marshal(i)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	_ = json.Unmarshal(out, &bb)
	bb = convertStructFieldToJSONString(bb, "metrics")
	bb = convertStructFieldToJSONString(bb, "metadata")
	return bb
}

func convertStructFieldToJSONString(bb map[string]interface{}, key string) map[string]interface{} {
	if val, ok := bb[key]; ok && val != nil {
		v, e := json.Marshal(val)
		if e == nil {
			bb[key] = string(v)
		} else {
			bb[key] = "error"
		}
	}
	return bb
}
