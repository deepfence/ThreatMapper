package cronscheduler

import (
	stdLogger "log"
	"os"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/robfig/cron/v3"
)

type Scheduler struct {
	cron           *cron.Cron
	tasksPublisher *kafka.Publisher
}

func NewScheduler(tasksPublisher *kafka.Publisher) (*Scheduler, error) {
	logger := stdLogger.New(os.Stdout, "cron: ", stdLogger.LstdFlags)
	scheduler := &Scheduler{
		cron:           cron.New(cron.WithSeconds(), cron.WithLocation(time.UTC), cron.WithLogger(cron.VerbosePrintfLogger(logger))),
		tasksPublisher: tasksPublisher,
	}
	err := scheduler.addJobs()
	if err != nil {
		return nil, err
	}
	return scheduler, nil
}

func (s *Scheduler) addJobs() error {
	var err error
	// Documentation: https://pkg.go.dev/github.com/robfig/cron#hdr-Usage
	_, err = s.cron.AddFunc("@every 30s", s.TriggerConsoleActionsTask)
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 120s", s.CleanUpGraphDBTask)
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 120s", s.RetryFailedScansTask)
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 120s", s.RetryFailedUpgradesTask)
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 10m", s.CleanUpPostgresqlTask)
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 60m", s.CheckAgentUpgradeTask)
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 300s", s.SyncRegistryTask)
	if err != nil {
		return err
	}
	return nil
}

func (s *Scheduler) Run() {
	s.cron.Run()
}

func (s *Scheduler) TriggerConsoleActionsTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := s.publishNewCronJob(metadata, utils.TriggerConsoleActionsTask, []byte(utils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) CleanUpGraphDBTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := s.publishNewCronJob(metadata, utils.CleanUpGraphDBTask, []byte(utils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) RetryFailedScansTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := s.publishNewCronJob(metadata, utils.RetryFailedScansTask, []byte(utils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) RetryFailedUpgradesTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := s.publishNewCronJob(metadata, utils.RetryFailedUpgradesTask, []byte(utils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) CleanUpPostgresqlTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := s.publishNewCronJob(metadata, utils.CleanUpPostgresqlTask, []byte(utils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) CheckAgentUpgradeTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := s.publishNewCronJob(metadata, utils.CheckAgentUpgradeTask, []byte(utils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) SyncRegistryTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := s.publishNewCronJob(metadata, utils.SyncRegistryTask, nil)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) publishNewCronJob(metadata map[string]string, topic string, data []byte) error {
	msg := message.NewMessage(watermill.NewUUID(), data)
	msg.Metadata = metadata
	middleware.SetCorrelationID(watermill.NewShortUUID(), msg)

	err := s.tasksPublisher.Publish(topic, msg)
	if err != nil {
		return err
	}
	return nil
}
