package cronjobs

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/controls"
	utils_ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	ctl "github.com/deepfence/ThreatMapper/deepfence_worker/controls"
	"github.com/hibiken/asynq"
)

const (
	ConsoleAgentId      = "deepfence-console-cron"
	ContextAllocatorKey = "scan-workload-allocator"
)

/*
Allocator shared across all workers instances per namespace using redis counter
*/
func TriggerConsoleControls(ctx context.Context, t *asynq.Task) error {
	ScanWorkloadAllocator := ctx.Value(ContextAllocatorKey).(*utils_ctl.RedisWorkloadAllocator)

	ns, _ := directory.ExtractNamespace(ctx)

	allocatable := ScanWorkloadAllocator.MaxAllocable()

	actions, errs := controls.GetAgentActions(ctx, ConsoleAgentId, int(allocatable))
	for _, e := range errs {
		if e != nil {
			log.Error().Msgf(e.Error())
		}
	}
	log.Info().Str("namespace", string(ns)).
		Msgf("Trigger console actions #capacity: %v got #actions: %d", allocatable, len(actions))

	ScanWorkloadAllocator.Reserve(int64(len(actions)))

	log.Debug().Msgf("Trigger console actions #actions: %d", len(actions))
	for _, action := range actions {
		log.Info().Msgf("Init execute: %v", action.ID)
		err := ctl.ApplyControl(ctx, action)
		if err != nil {
			ScanWorkloadAllocator.Free()
			log.Error().Msgf("Control %v failed: %v", action, err)
		}
	}
	return nil
}
