package directory

import (
	"context"
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
