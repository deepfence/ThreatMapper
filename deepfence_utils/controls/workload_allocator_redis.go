package controls

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/redis/go-redis/v9"
)

const (
	CurrentWorkloadCounter = "current-workload-counter"
)

type RedisWorkloadAllocator struct {
	maxWorkload int64
	namespace   directory.NamespaceID
	rdb         *redis.Client
}

func (rwa *RedisWorkloadAllocator) Reserve(delta int64) {
	result := rwa.rdb.IncrBy(context.Background(), CurrentWorkloadCounter, delta)
	if result.Err() != nil {
		log.Error().Err(result.Err()).Msgf("failed to reserve allocator count for ns %s", string(rwa.namespace))
	}
}

func (rwa *RedisWorkloadAllocator) Free() {

	var (
		current int64
		err     error
	)

	result := rwa.rdb.Get(context.Background(), CurrentWorkloadCounter)
	if result.Err() != nil {
		log.Error().Err(result.Err()).Msgf("failed to get current allocator for ns %s", string(rwa.namespace))
	}
	current, err = result.Int64()
	if err != nil {
		log.Error().Err(result.Err()).Msgf("failed to convert allocator to int64 for ns %s", string(rwa.namespace))
	}
	if current < 0 {
		// check if counter is already negative
		result := rwa.rdb.Set(context.Background(), CurrentWorkloadCounter, 0, 0)
		if result.Err() != nil {
			log.Error().Err(result.Err()).Msgf("failed to set allocator to 0 for ns %s", string(rwa.namespace))
		}
	} else {
		result := rwa.rdb.Decr(context.Background(), CurrentWorkloadCounter)
		if result.Err() != nil {
			log.Error().Err(result.Err()).Msgf("failed to decr allocator for ns %s", string(rwa.namespace))
		}
	}
}

func (rwa *RedisWorkloadAllocator) MaxAllocable() int64 {
	result := rwa.rdb.Get(context.Background(), CurrentWorkloadCounter)
	if result.Err() != nil {
		log.Error().Err(result.Err()).Msgf("failed to get current allocator for ns %s", string(rwa.namespace))
	}
	current, err := result.Int64()
	if err != nil {
		current = 0
	}
	delta := rwa.maxWorkload - current
	if delta < 0 {
		return 0
	}
	return delta
}

func NewRedisWorkloadAllocator(maxWorkload int64, namespace directory.NamespaceID, config *directory.RedisConfig) *RedisWorkloadAllocator {
	return &RedisWorkloadAllocator{
		maxWorkload: maxWorkload,
		namespace:   namespace,
		rdb: redis.NewClient(
			&redis.Options{
				Addr:     config.Endpoint,
				Password: config.Password,
				DB:       config.Database,
				PoolSize: 5,
			},
		),
	}
}
