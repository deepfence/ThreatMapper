package directory

import (
	"context"

	"github.com/go-redis/redis/v8"
	"github.com/hibiken/asynq"
)

func get_client[T redis.Client | asynq.Client](ctx context.Context, pool map[NamespaceID]*T, new_client func(DBEndpoints) *T) *T {
	key, err := ExtractNamespace(ctx)
	if err != nil {
		return nil
	}
	val, has := pool[key]
	if has {
		return val
	}

	client := new_client(directory[key])
	pool[key] = client
	return client
}

func (r RedisAddr) Str() string {
	return string(r)
}

func (r Neo4jAddr) Str() string {
	return string(r)
}

func (r PosgresAddr) Str() string {
	return string(r)
}
