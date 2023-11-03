package directory

import (
	"context"
	"errors"
	"sync"

	"github.com/hibiken/asynq"
)

const (
	max_size = 500 * 1024 * 1024 // 500 MB
)

var ErrExhaustedResources = errors.New("Exhausted worker resources")

type asyncq_clients struct {
	client    *asynq.Client
	inspector *asynq.Inspector
}

type WorkEnqueuer struct {
	clients asyncq_clients
}

var worker_clients_pool sync.Map

func init() {
	worker_clients_pool = sync.Map{}
}

func new_asynq_client(endpoints DBConfigs) (*asyncq_clients, error) {
	if endpoints.Redis == nil {
		return nil, errors.New("No defined Redis config")
	}
	redisCfg := asynq.RedisClientOpt{Addr: endpoints.Redis.Endpoint}
	return &asyncq_clients{
		client:    asynq.NewClient(redisCfg),
		inspector: asynq.NewInspector(redisCfg),
	}, nil
}

func (ws WorkEnqueuer) Enqueue(task_enum string, data []byte, opts ...asynq.Option) error {

	client := ws.clients.client
	inspector := ws.clients.inspector

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

	_, err = client.Enqueue(asynq.NewTask(task_enum, data), opts...)

	return err
}

func Worker(ctx context.Context) (WorkEnqueuer, error) {
	client, err := getClient(ctx, &worker_clients_pool, new_asynq_client)
	if err != nil {
		return WorkEnqueuer{}, err
	}

	return WorkEnqueuer{clients: *client}, err
}
