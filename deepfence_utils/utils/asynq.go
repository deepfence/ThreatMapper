package utils

import (
	"sync"

	"github.com/hibiken/asynq"
)

const (
	DefaultTaskMaxRetries = 3

	Q_CRITICAL = "critical"
	Q_DEFAULT  = "default"
	Q_LOW      = "low"
)

var (
	maxRetry int
	once     sync.Once
)

func TasksMaxRetries() asynq.Option {
	once.Do(
		func() {
			maxRetry = GetEnvOrDefaultInt("DEEPFENCE_TASKS_MAX_RETRIES", DefaultTaskMaxRetries)
		},
	)
	return asynq.MaxRetry(maxRetry)
}

func TaskOptions(queue string, opts ...asynq.Option) []asynq.Option {
	newOpts := []asynq.Option{asynq.Queue(queue)}
	newOpts = append(newOpts, opts...)
	return newOpts
}

func CritialTaskOpts(opts ...asynq.Option) []asynq.Option {
	return TaskOptions(Q_CRITICAL, append(opts, TasksMaxRetries())...)
}

func DefaultTaskOpts(opts ...asynq.Option) []asynq.Option {
	return TaskOptions(Q_DEFAULT, append(opts, TasksMaxRetries())...)
}

func LowTaskOpts(opts ...asynq.Option) []asynq.Option {
	return TaskOptions(Q_LOW, append(opts, TasksMaxRetries())...)
}
