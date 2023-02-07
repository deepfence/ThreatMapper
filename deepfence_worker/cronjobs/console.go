package cronjobs

import (
	"fmt"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_server/controls"
	ctl "github.com/deepfence/ThreatMapper/deepfence_worker/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/sirupsen/logrus"
)

const (
	ConsoleAgentId = "deepfence-console-cron"
	MaxWorkload    = 10
)

func TriggerConsoleControls(msg *message.Message) error {

	log.Info().Msg("Trigger console actions")

	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	actions, err := controls.GetAgentActions(ctx, ConsoleAgentId, MaxWorkload)
	if err != nil {
		return fmt.Errorf("%v", err)
	}

	for _, action := range actions {
		logrus.Infof("Init execute :%v", action.ID)
		err := ctl.ApplyControl(action)
		if err != nil {
			logrus.Errorf("Control %v failed: %v\n", action, err)
		}
	}
	return nil
}
