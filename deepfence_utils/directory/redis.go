package directory

import (
	"context"
	"errors"
	"sync"

	"github.com/redis/go-redis/v9"
)

var redisClientsPool sync.Map

func init() {
	redisClientsPool = sync.Map{}
}

func newRedisClient(endpoints DBConfigs) (*redis.Client, error) {
	redisOptions := &redis.Options{
		Addr: endpoints.Redis.Endpoint,
		DB:   endpoints.Redis.Database,
	}
	if endpoints.Redis.Password != "" {
		redisOptions.Password = endpoints.Redis.Password
	}
	return redis.NewClient(redisOptions), nil
}

func RedisClient(ctx context.Context) (*redis.Client, error) {
	return getClient(ctx, &redisClientsPool, newRedisClient)
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
