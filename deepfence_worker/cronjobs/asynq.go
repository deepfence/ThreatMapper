package cronjobs

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/hibiken/asynq"
)

func AsynqDeleteAllArchivedTasks(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	worker, err := directory.Worker(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	deletedTasksCount, errs := worker.DeleteAllArchivedTasks()
	for _, err := range errs {
		log.Error().Msg(err.Error())
	}
	if deletedTasksCount > 0 {
		log.Info().Msgf("Deleted %d archived tasks.", deletedTasksCount)
	}
	return nil
}
