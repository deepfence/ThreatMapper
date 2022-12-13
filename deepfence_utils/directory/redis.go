package directory

import (
	"context"
	"errors"

	"github.com/go-redis/redis/v8"
)

var redisClientsPool map[NamespaceID]*redis.Client

func init() {
	redisClientsPool = map[NamespaceID]*redis.Client{}
}

func newRedisClient(endpoints DBConfigs) (*redis.Client, error) {
	return redis.NewClient(&redis.Options{
		Addr:     endpoints.Redis.Endpoint,
		Password: endpoints.Redis.Endpoint,
		DB:       endpoints.Redis.Database,
	}), nil
}

func RedisClient(ctx context.Context) (*redis.Client, error) {
	return getClient(ctx, redisClientsPool, newRedisClient)
}

func GetRedisConfig(ctx context.Context) (RedisConfig, error) {
	namespace, err := ExtractNamespace(ctx)
	if err != nil {
		return RedisConfig{}, err
	}
	endpoints, has := directory[namespace]
	if !has {
		return RedisConfig{}, errors.New("missing directory entry")
	}
	return endpoints.Redis, nil
}
