package directory

import (
	"context"
	"errors"

	"github.com/hibiken/asynq"
)

const (
	max_size = 500 * 1024 * 1024 // 500 MB
)

var ErrExhaustedResources = errors.New("Exhausted worker resources")

type async_clients struct {
	client    *asynq.Client
	inspector *asynq.Inspector
}

var worker_clients_pool map[NamespaceID]*async_clients

func init() {
	worker_clients_pool = map[NamespaceID]*async_clients{}
}

func new_asynq_client(endpoints DBConfigs) (*async_clients, error) {
	redisCfg := asynq.RedisClientOpt{Addr: endpoints.Redis.Endpoint}
	return &async_clients{
		client:    asynq.NewClient(redisCfg),
		inspector: asynq.NewInspector(redisCfg),
	}, nil
}

func WorkerEnqueue(ctx context.Context, task *asynq.Task) error {

	clients, err := get_client(ctx, worker_clients_pool, new_asynq_client)
	if err != nil {
		return err
	}

	client := clients.client
	inspector := clients.inspector

	qs, err := inspector.Queues()
	if err != nil {
		return err
	}
	size := 0
	for _, q := range qs {
		res, err := inspector.GetQueueInfo(q)
		if err != nil {
			continue
		}
		size += res.Size
	}

	if size >= max_size {
		return ErrExhaustedResources
	}

	client.Enqueue(task)
	return nil
}
