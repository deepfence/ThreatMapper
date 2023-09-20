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
	ConsoleAgentId = "deepfence-console-cron"
	MaxWorkload    = 5
)

var (
	ScanWorkloadAllocator = utils_ctl.NewWorkloadAllocator(MaxWorkload)
)

/*
While this functon is a cron job, it is running on the worker's address space
Hence Allocator can be shared across tasks
*/
func TriggerConsoleControls(ctx context.Context, t *asynq.Task) error {
	log.Debug().Msgf("Trigger console actions #capacity: %v", ScanWorkloadAllocator.MaxAllocable())

	actions, errs := controls.GetAgentActions(ctx, ConsoleAgentId, int(ScanWorkloadAllocator.MaxAllocable()))
	for _, e := range errs {
		if e != nil {
			log.Error().Msgf(e.Error())
		}
	}

	ScanWorkloadAllocator.Reserve(int32(len(actions)))

	log.Debug().Msgf("Trigger console actions #actions: %d", len(actions))
	ns, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}

	for _, action := range actions {
		log.Info().Msgf("Init execute: %v", action.ID)
		err := ctl.ApplyControl(ns, action)
		if err != nil {
			log.Error().Msgf("Control %v failed: %v", action, err)
		}
	}
	return nil
}
