package directory

import (
	"context"

	"github.com/hibiken/asynq"
)

var worker_clients_pool map[NamespaceID]*asynq.Client

func init() {
	worker_clients_pool = map[NamespaceID]*asynq.Client{}
}

func new_asynq_client(endpoints DBEndpoints) *asynq.Client {
	return asynq.NewClient(asynq.RedisClientOpt{Addr: endpoints.RedisEndpoint.Str()})
}

func WorkerClient(ctx context.Context) *asynq.Client {
	return get_client(ctx, worker_clients_pool, new_asynq_client)
}
