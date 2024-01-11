package cronjobs

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/controls"
	utilsCtl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	ctl "github.com/deepfence/ThreatMapper/deepfence_worker/controls"
	"github.com/hibiken/asynq"
)

const (
	ConsoleAgentId = "deepfence-console-cron"
)

/*
Allocator shared across all workers instances per namespace using redis counter
*/
func TriggerConsoleControls(ctx context.Context, t *asynq.Task) error {
	allocator := ctx.Value(utilsCtl.ContextAllocatorKey).(*utilsCtl.RedisWorkloadAllocator)
	if allocator != nil {
		defer allocator.Free()
	} else {
		return utilsCtl.ErrCtxAllocatorNotFound
	}

	ns, _ := directory.ExtractNamespace(ctx)

	allocatable := allocator.MaxAllocable()

	log.Info().Str("namespace", string(ns)).
		Msgf("Trigger console actions #capacity: %v", allocatable)

	actions, errs := controls.GetAgentActions(ctx, ConsoleAgentId, int(allocatable))
	for _, e := range errs {
		if e != nil {
			log.Error().Msgf(e.Error())
		}
	}

	log.Info().Str("namespace", string(ns)).
		Msgf("Trigger console actions got #actions: %d", len(actions))

	allocator.Reserve(int64(len(actions)))

	log.Debug().Msgf("Trigger console actions #actions: %d", len(actions))
	for _, action := range actions {
		log.Info().Msgf("Init execute: %v", action.ID)
		err := ctl.ApplyControl(ctx, action)
		if err != nil {
			allocator.Free()
			log.Error().Msgf("Control %v failed: %v", action, err)
		}
	}
	return nil
}
