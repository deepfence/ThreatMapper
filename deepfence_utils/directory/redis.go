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

func new_redis_client(endpoints DBEndpoints) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     endpoints.RedisEndpoint.Str(),
		Password: "",
		DB:       0,
	})
}

func RedisClient(ctx context.Context) *redis.Client {
	return get_client(ctx, redis_clients_pool, new_redis_client)
}

func RedisEndpoint(ctx context.Context) (RedisAddr, error) {
	namespace, err := ExtractNamespace(ctx)
	if err != nil {
		return "", err
	}
	endpoints, has := directory[namespace]
	if !has {
		return "", errors.New("Missing direcotry entry")
	}
	return endpoints.RedisEndpoint, nil
}
