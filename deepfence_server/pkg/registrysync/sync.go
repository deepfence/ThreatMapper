package registrysync

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	dferror "github.com/deepfence/ThreatMapper/deepfence_utils/errors"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
)

var ChunkSize = 500

func SyncRegistry(ctx context.Context, pgClient *postgresqlDb.Queries, r registry.Registry, row postgresqlDb.GetContainerRegistriesRow) error {
	syncStatus := SyncStatus{}

	ctx, span := telemetry.NewSpan(ctx, "registry", "sync-registry")
	defer span.End()

	log := log.WithCtx(ctx)

	// set registry account syncing
	syncStatus.Syncing = true
	err := SetRegistryAccountSyncing(ctx, syncStatus, r, row.ID)
	if err != nil {
		return err
	}

	defer func() {
		syncStatus.Syncing = false
		err := SetRegistryAccountSyncing(ctx, syncStatus, r, row.ID)
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

	list, err := r.FetchImagesFromRegistry(ctx)
	if err != nil {
		if err == dferror.ErrTooManyRequests {
			log.Warn().Msgf("rate limit exceeded for registry even after retry id=%d type=%s", row.ID, r.GetRegistryType())
			return nil
		}
		return err
	}

	log.Info().Msgf("sync registry id=%d type=%s found %d images",
		row.ID, r.GetRegistryType(), len(list))

	// batch insert to neo4j with retries
	chunks := chunkBy(list, ChunkSize)

	var errs []error
	for i := range chunks {

		log.Debug().Msgf("sync registry insert batch %d id=%d type=%s batch=%d",
			i, row.ID, r.GetRegistryType(), len(chunks[i]))

		op := func() error {
			return insertToNeo4j(ctx, chunks[i], r, row.ID, row.Name)
		}

		notify := func(err error, d time.Duration) {
			log.Error().Err(err).Msgf("waited %s before retry inserting batch %d id=%d type=%s error: %s",
				d, i, row.ID, r.GetRegistryType(), err)
		}

		bf := backoff.NewConstantBackOff(5 * time.Second)

		err := backoff.RetryNotify(op, backoff.WithMaxRetries(bf, 3), notify)
		if err != nil {
			log.Error().Err(err).Msgf("failed to insert registry images batch %d id=%d type=%s",
				i, row.ID, r.GetRegistryType())
			errs = append(errs, err)
		}
	}

	if len(errs) == 0 {
		syncStatus.SyncSucc = true
	}

	return errors.Join(errs...)
}

func insertToNeo4j(ctx context.Context, images []model.IngestedContainerImage,
	r registry.Registry, pgID int32, name string) error {

	ctx, span := telemetry.NewSpan(ctx, "registry", "insert-to-neo4j")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	timeOut := time.Duration(120 * time.Second)
	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(timeOut))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	imageMap := RegistryImagesToMaps(images)

	registryID := utils.GetRegistryID(r.GetRegistryType(), r.GetNamespace(), pgID)

	insertQuery := `
	UNWIND $batch as row
	MERGE (n:ContainerImage{node_id:row.node_id})
	MERGE (s:ImageStub{node_id: row.docker_image_name + "_" + $registry_id, docker_image_name: row.docker_image_name})
	MERGE (n) -[:IS]-> (s)
	MERGE (m:RegistryAccount{node_id:$registry_id})
	MERGE (m) -[:HOSTS]-> (n)
	MERGE (m) -[:HOSTS]-> (s)
	SET n+= row,
		n.updated_at = TIMESTAMP(),
		m.container_registry_ids = REDUCE(distinctElements = [], element IN COALESCE(m.container_registry_ids, []) + $pgId | CASE WHEN NOT element in distinctElements THEN distinctElements + element ELSE distinctElements END),
		n.node_type='container_image',
		m.registry_type=$registry_type,
		m.name=$name,
		n.pseudo=false,
		n.active=true,
		n.docker_image_tag_list = REDUCE(distinctElements = [], element IN COALESCE(n.docker_image_tag_list, []) + (row.docker_image_name+":"+row.docker_image_tag) | CASE WHEN NOT element in distinctElements THEN distinctElements + element ELSE distinctElements END),
		n.node_name=n.docker_image_name+":"+n.docker_image_tag+" ("+n.short_image_id+")",
		s.updated_at = TIMESTAMP(),
		s.tags = REDUCE(distinctElements = [], element IN COALESCE(s.tags, []) + row.docker_image_tag | CASE WHEN NOT element in distinctElements THEN distinctElements + element ELSE distinctElements END)`

	_, err = tx.Run(ctx, insertQuery,
		map[string]interface{}{
			"batch": imageMap, "registry_id": registryID,
			"pgId": pgID, "registry_type": r.GetRegistryType(),
			"name": name,
		})
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
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

type SyncStatus struct {
	Syncing  bool
	SyncSucc bool
}

func SetRegistryAccountSyncing(ctx context.Context, syncStatus SyncStatus, r registry.Registry, pgID int32) error {

	ctx, span := telemetry.NewSpan(ctx, "registry", "set-registry-account-syncing")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx)
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	registryID := utils.GetRegistryID(r.GetRegistryType(), r.GetNamespace(), pgID)

	query := `
	MATCH (m:RegistryAccount{node_id:$registry_id})
	SET m.syncing=$syncing, m.updated_at=TIMESTAMP()`
	if syncStatus.SyncSucc {
		query += `, m.last_synced_at=TIMESTAMP()`
	}

	_, err = tx.Run(ctx, query,
		map[string]interface{}{
			"registry_id": registryID,
			"syncing":     syncStatus.Syncing,
		})
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func chunkBy(items []model.IngestedContainerImage, chunkSize int) (chunks [][]model.IngestedContainerImage) {
	for chunkSize < len(items) {
		items, chunks = items[chunkSize:], append(chunks, items[:chunkSize])
	}
	return append(chunks, items)
}
