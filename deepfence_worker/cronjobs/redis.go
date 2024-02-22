package cronjobs

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/hibiken/asynq"
)

func RedisRewriteAOF(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	rdb, err := directory.RedisClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	err = rdb.BgRewriteAOF(ctx).Err()
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	return nil
}
