package cronjobs

import (
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_server/controls"
	utils_ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	ctl "github.com/deepfence/ThreatMapper/deepfence_worker/controls"
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
func TriggerConsoleControls(msg *message.Message) error {
	topic := RecordOffsets(msg)
	defer SetTopicHandlerStatus(topic, false)

	log.Debug().Msgf("Trigger console actions #capacity: %v", ScanWorkloadAllocator.MaxAllocable())

	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	actions, errs := controls.GetAgentActions(ctx, ConsoleAgentId, int(ScanWorkloadAllocator.MaxAllocable()))
	for _, e := range errs {
		if e != nil {
			log.Error().Msgf(e.Error())
		}
	}

	ScanWorkloadAllocator.Reserve(int32(len(actions)))

	log.Debug().Msgf("Trigger console actions #actions: %d", len(actions))

	for _, action := range actions {
		log.Info().Msgf("Init execute: %v", action.ID)
		err := ctl.ApplyControl(namespace, action)
		if err != nil {
			log.Error().Msgf("Control %v failed: %v", action, err)
		}
	}
	return nil
}
