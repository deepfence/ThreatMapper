package connection

import "github.com/hibiken/asynq"

var client *asynq.Client

func init() {
	client = asynq.NewClient(asynq.RedisClientOpt{Addr: global.RedisEndpoint})
}

func WorkerClient() *asynq.Client {
	return client
}
