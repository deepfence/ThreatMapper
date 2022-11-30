package directory

import (
	"context"
	"errors"

	"github.com/go-redis/redis/v8"
)

var redis_clients_pool map[NamespaceID]*redis.Client

func init() {
	redis_clients_pool = map[NamespaceID]*redis.Client{}
}

func new_redis_client(endpoints DBConfigs) (*redis.Client, error) {
	return redis.NewClient(&redis.Options{
		Addr:     endpoints.Redis.Endpoint,
		Password: endpoints.Redis.Endpoint,
		DB:       endpoints.Redis.Database,
	}), nil
}

func RedisClient(ctx context.Context) (*redis.Client, error) {
	return get_client(ctx, redis_clients_pool, new_redis_client)
}

func GetRedisConfig(ctx context.Context) (*RedisConfig, error) {
	namespace, err := ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}
	endpoints, has := directory[namespace]
	if !has {
		return nil, errors.New("Missing direcotry entry")
	}
	return endpoints.Redis, nil
}
