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
	scheduler.startImmediately()
	return scheduler, nil
}

func (s *Scheduler) addJobs() error {
	log.Info().Msg("Register cronjobs")
	var err error
	// Documentation: https://pkg.go.dev/github.com/robfig/cron#hdr-Usage
	_, err = s.cron.AddFunc("@every 30s", s.enqueueTask(sdkUtils.TriggerConsoleActionsTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 120s", s.enqueueTask(sdkUtils.CleanUpGraphDBTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 120s", s.enqueueTask(sdkUtils.ComputeThreatTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 120s", s.enqueueTask(sdkUtils.RetryFailedScansTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 10m", s.enqueueTask(sdkUtils.RetryFailedUpgradesTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 10m", s.enqueueTask(sdkUtils.CleanUpPostgresqlTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 60m", s.enqueueTask(sdkUtils.CleanupDiagnosisLogs))
	if err != nil {
		return err
	}
	// Adding CloudComplianceTask only to ensure data is ingested if task fails on startup, Retry to be handled by watermill
	_, err = s.cron.AddFunc("@every 60m", s.enqueueTask(sdkUtils.CloudComplianceTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 60m", s.enqueueTask(sdkUtils.CheckAgentUpgradeTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 300s", s.enqueueTask(sdkUtils.SyncRegistryTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 30s", s.enqueueTask(sdkUtils.SendNotificationTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 60m", s.enqueueTask(sdkUtils.ReportCleanUpTask))
	if err != nil {
		return err
	}
	return nil
}

func (s *Scheduler) startImmediately() {
	log.Info().Msg("Start immediate cronjobs")
	s.enqueueTask(sdkUtils.SetUpGraphDBTask)()
	s.enqueueTask(sdkUtils.CheckAgentUpgradeTask)()
	s.enqueueTask(sdkUtils.SyncRegistryTask)()
	s.enqueueTask(sdkUtils.CloudComplianceTask)()
	s.enqueueTask(sdkUtils.ReportCleanUpTask)()
}

func (s *Scheduler) Run() {
	s.cron.Run()
}

func (s *Scheduler) enqueueTask(task string) func() {
	log.Info().Msgf("Registering task: %s", task)
	return func() {
		log.Info().Msgf("Enqueuing task: %s", task)
		metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
		err := utils.PublishNewJob(s.tasksPublisher, metadata, task, []byte(sdkUtils.GetDatetimeNow()))
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}
