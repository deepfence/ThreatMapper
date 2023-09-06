package registrysync

import (
	"context"
	"encoding/json"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
)

func SyncRegistry(ctx context.Context, pgClient *postgresqlDb.Queries, r registry.Registry, pgId int32) error {
	// set registry account syncing
	err := setRegistryAccountSyncing(ctx, true, r)
	if err != nil {
		return err
	}

	defer func() {
		err := setRegistryAccountSyncing(ctx, false, r)
		if err != nil {
			log.Error().Msgf("failed to set registry account syncing to false, err: %v", err)
		}
	}()

	// decrypt secret
	aesValue, err := model.GetAESValueForEncryption(ctx, pgClient)
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

	err = r.DecryptExtras(aes)
	if err != nil {
		return err
	}

	list, err := r.FetchImagesFromRegistry()
	if err != nil {
		return err
	}
	log.Info().Msgf("sync registry id=%d type=%s found %d images", pgId, r.GetRegistryType(), len(list))
	return insertToNeo4j(ctx, list, r, pgId)
}

func insertToNeo4j(ctx context.Context, images []model.IngestedContainerImage, r registry.Registry, pgId int32) error {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close()

	timeOut := time.Duration(120 * time.Second)
	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(timeOut))
	if err != nil {
		return err
	}
	defer tx.Close()

	imageMap := RegistryImagesToMaps(images)
	registryId := model.GetRegistryID(r.GetRegistryType(), r.GetNamespace())
	_, err = tx.Run(`
		UNWIND $batch as row
		MERGE (n:ContainerImage{node_id:row.node_id})
		MERGE (s:ImageStub{node_id: row.docker_image_name + "_" + $registry_id, docker_image_name: row.docker_image_name})
		MERGE (n) -[:IS]-> (s)
		MERGE (m:RegistryAccount{node_id:$registry_id})
		MERGE (m) -[:HOSTS]-> (n)
		MERGE (m) -[:HOSTS]-> (s)
		SET n+= row, n.updated_at = TIMESTAMP(),
		m.container_registry_ids = REDUCE(distinctElements = [], element IN COALESCE(m.container_registry_ids, []) + $pgId | CASE WHEN NOT element in distinctElements THEN distinctElements + element ELSE distinctElements END),
		n.node_type='container_image',
		m.registry_type=$registry_type,
		n.pseudo=false,
		n.active=true,
		n.docker_image_tag_list = REDUCE(distinctElements = [], element IN COALESCE(n.docker_image_tag_list, []) + (row.docker_image_name+":"+row.docker_image_tag) | CASE WHEN NOT element in distinctElements THEN distinctElements + element ELSE distinctElements END),
		n.node_name=n.docker_image_name+":"+n.docker_image_tag+" ("+n.short_image_id+")",
		s.updated_at = TIMESTAMP(),
		s.tags = REDUCE(distinctElements = [], element IN COALESCE(s.tags, []) + row.docker_image_tag | CASE WHEN NOT element in distinctElements THEN distinctElements + element ELSE distinctElements END)`,
		map[string]interface{}{
			"batch": imageMap, "registry_id": registryId,
			"pgId": pgId, "registry_type": r.GetRegistryType(),
		})
	if err != nil {
		return err
	}

	return tx.Commit()
}

func RegistryImagesToMaps(ms []model.IngestedContainerImage) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, toMap(v))
	}
	return res
}

func toMap(i model.IngestedContainerImage) map[string]interface{} {
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

func setRegistryAccountSyncing(ctx context.Context, syncing bool, r registry.Registry) error {
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

	registryId := model.GetRegistryID(r.GetRegistryType(), r.GetNamespace())
	_, err = tx.Run(`
		MATCH (m:RegistryAccount{node_id:$registry_id})
		SET m.syncing=$syncing`,
		map[string]interface{}{
			"registry_id": registryId,
			"syncing":     syncing,
		})
	if err != nil {
		return err
	}

	return tx.Commit()
}
