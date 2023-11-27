package directory

import (
	"context"
	"sync"

	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/minio/minio-go/v7"
	"github.com/redis/go-redis/v9"
)

func getClient[T *redis.Client | *CypherDriver | *postgresqlDb.Queries | *minio.Client | *asynqClients](ctx context.Context, pool *sync.Map, newClientFN func(DBConfigs) (T, error)) (T, error) {
	key, err := ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}

	val, has := pool.Load(key)
	if has {
		return val.(T), nil
	}

	directory.RLock()
	namespace := directory.Directory[key]
	directory.RUnlock()
	client, err := newClientFN(namespace)
	if err != nil {
		return nil, err
	}
	newClient, _ := pool.LoadOrStore(key, client)
	return newClient.(T), nil
}
