package directory

import (
	"context"

	"github.com/hibiken/asynq"
)

var worker_clients_pool map[NamespaceID]*asynq.Client

func init() {
	worker_clients_pool = map[NamespaceID]*asynq.Client{}
}

func new_asynq_client(endpoints DBConfigs) (*asynq.Client, error) {
	return asynq.NewClient(asynq.RedisClientOpt{Addr: endpoints.Redis.Endpoint}), nil
}

func WorkerClient(ctx context.Context) (*asynq.Client, error) {
	return get_client(ctx, worker_clients_pool, new_asynq_client)
}
