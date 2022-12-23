package tasks

import (
	"context"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	"github.com/hibiken/asynq"
)

func HandleCleanUpGraphDBTask(_ context.Context, t *asynq.Task) error {
	ctx, err := directory.PayloadToContext(t.Payload())
	if err != nil {
		return err
	}

	start := time.Now()
	err = cronjobs.CleanUpDB(ctx)
	log.Info().Msgf("DB clean: %v", time.Since(start))

	if err != nil {
		log.Error().Msgf("Clean neo4j err: %v", err)
	}
	return err
}

func HandlScanRetryTask(_ context.Context, t *asynq.Task) error {
	ctx, err := directory.PayloadToContext(t.Payload())
	if err != nil {
		return err
	}

	err = cronjobs.RetryScansDB(ctx)

	if err != nil {
		log.Error().Msgf("Retry scan in Neo4j err: %v", err)
	}

	return err
}
