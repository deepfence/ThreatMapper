package cronjobs

import (
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_server/controls"
	ctl "github.com/deepfence/ThreatMapper/deepfence_worker/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

const (
	ConsoleAgentId = "deepfence-console-cron"
	MaxWorkload    = 10
)

func TriggerConsoleControls(msg *message.Message) error {

	log.Info().Msg("Trigger console actions")

	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	actions, errs := controls.GetAgentActions(ctx, ConsoleAgentId, MaxWorkload)
	for _, e := range errs {
		if e != nil {
			log.Error().Msgf(e.Error())
		}
	}

	for _, action := range actions {
		log.Info().Msgf("Init execute: %v", action.ID)
		err := ctl.ApplyControl(action)
		if err != nil {
			log.Error().Msgf("Control %v failed: %v\n", action, err)
		}
	}
	return nil
}
