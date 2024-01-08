package utils

import (
	"sync"

	"github.com/hibiken/asynq"
)

const (
	DefaultTaskMaxRetries = 3

	QCritical = "critical"
	QDefault  = "default"
	QLow      = "low"
)

var (
	AsynqQueues = []string{QCritical, QDefault, QLow}
	maxRetry    int
	once        sync.Once
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
	return TaskOptions(QCritical, append(opts, TasksMaxRetries())...)
}

func DefaultTaskOpts(opts ...asynq.Option) []asynq.Option {
	return TaskOptions(QDefault, append(opts, TasksMaxRetries())...)
}

func LowTaskOpts(opts ...asynq.Option) []asynq.Option {
	return TaskOptions(QLow, append(opts, TasksMaxRetries())...)
}
