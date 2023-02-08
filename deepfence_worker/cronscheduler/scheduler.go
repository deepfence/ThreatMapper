package cronscheduler

import (
	stdLogger "log"
	"os"
	"time"

	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	sdkUtils "github.com/deepfence/golang_deepfence_sdk/utils/utils"
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
	err := utils.PublishNewJob(s.tasksPublisher, metadata, sdkUtils.TriggerConsoleActionsTask, []byte(sdkUtils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) CleanUpGraphDBTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := utils.PublishNewJob(s.tasksPublisher, metadata, sdkUtils.CleanUpGraphDBTask, []byte(sdkUtils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) RetryFailedScansTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := utils.PublishNewJob(s.tasksPublisher, metadata, sdkUtils.RetryFailedScansTask, []byte(sdkUtils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) RetryFailedUpgradesTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := utils.PublishNewJob(s.tasksPublisher, metadata, sdkUtils.RetryFailedUpgradesTask, []byte(sdkUtils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) CleanUpPostgresqlTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := utils.PublishNewJob(s.tasksPublisher, metadata, sdkUtils.CleanUpPostgresqlTask, []byte(sdkUtils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) CheckAgentUpgradeTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := utils.PublishNewJob(s.tasksPublisher, metadata, sdkUtils.CheckAgentUpgradeTask, []byte(sdkUtils.GetDatetimeNow()))
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (s *Scheduler) SyncRegistryTask() {
	metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
	err := utils.PublishNewJob(s.tasksPublisher, metadata, sdkUtils.SyncRegistryTask, nil)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}
