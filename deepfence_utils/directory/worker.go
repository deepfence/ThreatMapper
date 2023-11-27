package directory

import (
	"context"
	"errors"
	"sync"

	"github.com/hibiken/asynq"
)

const (
	maxSize = 500 * 1024 * 1024 // 500 MB
)

var ErrExhaustedResources = errors.New("exhausted worker resources")

type asynqClients struct {
	client    *asynq.Client
	inspector *asynq.Inspector
}

type WorkEnqueuer struct {
	clients asynqClients
}

var workerClientsPool sync.Map

func init() {
	workerClientsPool = sync.Map{}
}

func newAsynqClient(endpoints DBConfigs) (*asynqClients, error) {
	if endpoints.Redis == nil {
		return nil, errors.New("no defined Redis config")
	}
	redisCfg := asynq.RedisClientOpt{Addr: endpoints.Redis.Endpoint}
	return &asynqClients{
		client:    asynq.NewClient(redisCfg),
		inspector: asynq.NewInspector(redisCfg),
	}, nil
}

func (ws WorkEnqueuer) Enqueue(taskEnum string, data []byte, opts ...asynq.Option) error {

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

	if size >= maxSize {
		return ErrExhaustedResources
	}

	_, err = client.Enqueue(asynq.NewTask(taskEnum, data), opts...)

	return err
}

func Worker(ctx context.Context) (WorkEnqueuer, error) {
	client, err := getClient(ctx, &workerClientsPool, newAsynqClient)
	if err != nil {
		return WorkEnqueuer{}, err
	}

	return WorkEnqueuer{clients: *client}, err
}
