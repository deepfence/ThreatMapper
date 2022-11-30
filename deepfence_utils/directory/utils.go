package directory

import (
	"context"

	"github.com/go-redis/redis/v8"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func get_client[T *redis.Client | *async_clients | *neo4j.Driver](ctx context.Context, pool map[NamespaceID]T, new_client func(DBConfigs) (T, error)) (T, error) {
	key, err := ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}
	val, has := pool[key]
	if has {
		return val, nil
	}

	client, err := new_client(directory[key])
	if err != nil {
		return nil, err
	}
	pool[key] = client
	return client, nil
}
