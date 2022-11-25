package handler

import (
	"context"

	"github.com/hibiken/asynq"
)

func IngestAgentReport(ctx context.Context, t *asynq.Task) error {
	return nil
}

func IngestCloudScannerReport(ctx context.Context, t *asynq.Task) error {
	return nil
}

func IngestAgentScannerReport(ctx context.Context, t *asynq.Task) error {
	return nil
}

func IngestAgentAlerts(ctx context.Context, t *asynq.Task) error {
	return nil
}
