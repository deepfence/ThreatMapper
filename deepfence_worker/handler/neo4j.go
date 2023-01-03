package handler

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks"
	"github.com/hibiken/asynq"
)

func CleanUpGraphDB(ctx context.Context, t *asynq.Task) error {
	return tasks.HandleCleanUpGraphDBTask(ctx, t)
}

func RetryScansGraphDB(ctx context.Context, t *asynq.Task) error {
	return tasks.HandlScanRetryTask(ctx, t)
}
