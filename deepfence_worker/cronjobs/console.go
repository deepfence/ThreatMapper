package cronjobs

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/controls"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	ctls "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ctl "github.com/deepfence/ThreatMapper/deepfence_worker/controls"
	"github.com/hibiken/asynq"
	"github.com/jellydator/ttlcache/v3"
)

const (
	ConsoleAgentId = "deepfence-console-cron"
)

type ConsoleController struct {
	MaxWorkload int
	TTLCache    *ttlcache.Cache[string, string]
}

func NewConsoleController(max int) ConsoleController {
	return ConsoleController{
		MaxWorkload: max,
		TTLCache: ttlcache.New[string, string](
			ttlcache.WithDisableTouchOnHit[string, string](),
		),
	}
}

/*
Allocator shared across all workers instances per namespace
*/
func (c ConsoleController) TriggerConsoleControls(ctx context.Context, t *asynq.Task) error {

	log := log.WithCtx(ctx)

	allocatable := MaxAllocable(ctx, c.MaxWorkload)

	log.Info().
		Msgf("Trigger console actions #capacity: %d", allocatable)

	// skip if capacity is zero
	if allocatable <= 0 {
		log.Info().
			Msgf("Skip console actions #capacity: %d", allocatable)
		return nil
	}

	agentID := model.AgentID{}
	agentID.NodeID = ConsoleAgentId
	agentID.AvailableWorkload = int(allocatable)

	actions, errs := controls.GetAgentActions(ctx, agentID, "", c.TTLCache)
	for _, e := range errs {
		if e != nil {
			log.Error().Msgf(e.Error())
		}
	}

	log.Info().
		Msgf("Trigger console actions got #actions: %d", len(actions))

	for _, action := range actions {
		log.Info().Msgf("Init execute: %v", action.ID)
		if shouldSkipApply(action.ID) {
			log.Info().Msgf("skip control %v", action.ID)
			continue
		}
		err := ctl.ApplyControl(ctx, action)
		if err != nil {
			log.Error().Msgf("Control %v failed: %v", action, err)
		}
	}
	return nil
}

func shouldSkipApply(action ctls.ActionID) bool {
	return action == ctls.UpdateAgentThreatIntel
}

// list of task types to count towards running
func shouldInclude(name string) bool {
	return name == utils.SecretScanTask ||
		name == utils.MalwareScanTask ||
		name == utils.GenerateSBOMTask ||
		name == utils.ScanSBOMTask ||
		name == utils.StopSecretScanTask ||
		name == utils.StopMalwareScanTask ||
		name == utils.StopVulnerabilityScanTask
}

func MaxAllocable(ctx context.Context, max int) int {

	log := log.WithCtx(ctx)

	worker, err := directory.Worker(ctx)
	if err != nil {
		log.Error().Err(err).Msgf("failed to get worker instance")
		return 0
	}

	queues, err := worker.Inspector().Queues()
	if err != nil {
		log.Error().Err(err).Msgf("failed to get worker queues")
		return 0
	}

	var tasks []*asynq.TaskInfo

	for _, q := range queues {

		var err error

		// active tasks
		active, err := worker.Inspector().ListActiveTasks(q, asynq.PageSize(5000))
		if err != nil {
			log.Error().Err(err).Msgf("failed to get active tasks from queue %s", q)
		} else {
			tasks = append(tasks, active...)
		}
		// pending tasks
		pending, err := worker.Inspector().ListPendingTasks(q, asynq.PageSize(5000))
		if err != nil {
			log.Error().Err(err).Msgf("failed to get pending tasks from queue %s", q)
		} else {
			tasks = append(tasks, pending...)
		}
		// retry tasks
		retry, err := worker.Inspector().ListRetryTasks(q, asynq.PageSize(5000))
		if err != nil {
			log.Error().Err(err).Msgf("failed to get retry tasks from queue %s", q)
		} else {
			tasks = append(tasks, retry...)
		}
	}

	queued := 0

	for _, task := range tasks {
		if shouldInclude(task.Type) {
			queued += 1
		}
	}

	allocatable := max - queued

	if allocatable > 0 {
		return allocatable
	}

	return 0

}
