package directory

import (
	"context"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/minio/minio-go/v7"

	"github.com/go-redis/redis/v8"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func getClient[T *redis.Client | *async_clients | *neo4j.Driver | *postgresqlDb.Queries | *minio.Client](ctx context.Context, pool map[NamespaceID]T, newClient func(DBConfigs) (T, error)) (T, error) {
	key, err := ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}
	val, has := pool[key]
	if has {
		return val, nil
	}

	client, err := newClient(directory[key])
	if err != nil {
		return nil, err
	}
	pool[key] = client
	return client, nil
}
