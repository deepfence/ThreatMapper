package cronscheduler

import (
	"encoding/json"
	stdLogger "log"
	"os"
	"sync"
	"time"

	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	postgresqlDb "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	sdkUtils "github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/robfig/cron/v3"
)

type ScheduledJobs struct {
	jobHashToId map[string]cron.EntryID
	jobHashes   []string
	sync.Mutex
}

type Scheduler struct {
	cron           *cron.Cron
	tasksPublisher *kafka.Publisher
	scheduledJobs  ScheduledJobs
}

func NewScheduler(tasksPublisher *kafka.Publisher) (*Scheduler, error) {
	logger := stdLogger.New(os.Stdout, "cron: ", stdLogger.LstdFlags)
	scheduler := &Scheduler{
		cron:           cron.New(cron.WithSeconds(), cron.WithLocation(time.UTC), cron.WithLogger(cron.VerbosePrintfLogger(logger))),
		tasksPublisher: tasksPublisher,
		scheduledJobs: ScheduledJobs{
			jobHashToId: make(map[string]cron.EntryID),
			jobHashes:   []string{},
		},
	}
	err := scheduler.addJobs()
	if err != nil {
		return nil, err
	}
	scheduler.startImmediately()
	go scheduler.updateScheduledJobs()
	return scheduler, nil
}

func (s *Scheduler) updateScheduledJobs() {
	err := s.addScheduledJobs()
	if err != nil {
		log.Warn().Msg("Add scheduled jobs: " + err.Error())
	}

	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			err = s.addScheduledJobs()
			if err != nil {
				log.Warn().Msg("Add scheduled jobs: " + err.Error())
			}
		}
	}
}

func (s *Scheduler) addScheduledJobs() error {
	// Get scheduled tasks
	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}
	schedules, err := pgClient.GetActiveSchedules(ctx)
	if err != nil {
		return err
	}

	s.scheduledJobs.Lock()
	defer s.scheduledJobs.Unlock()

	var newHashes []string
	newJobHashToId := make(map[string]cron.EntryID)
	for _, schedule := range schedules {
		jobHash := sdkUtils.GetScheduledJobHash(schedule)
		if sdkUtils.InSlice(jobHash, s.scheduledJobs.jobHashes) {
			newHashes = append(newHashes, jobHash)
			newJobHashToId[jobHash] = s.scheduledJobs.jobHashToId[jobHash]
			continue
		}
		var payload map[string]string
		err = json.Unmarshal(schedule.Payload, &payload)
		if err != nil {
			log.Error().Msg("addScheduledJobs payload: " + err.Error())
			continue
		}
		jobId, err := s.cron.AddFunc(schedule.CronExpr, s.enqueueScheduledTask(schedule, payload))
		if err != nil {
			return err
		}
		newHashes = append(newHashes, jobHash)
		newJobHashToId[jobHash] = jobId
	}
	for _, oldJobHash := range s.scheduledJobs.jobHashes {
		if !sdkUtils.InSlice(oldJobHash, s.scheduledJobs.jobHashes) {
			s.cron.Remove(s.scheduledJobs.jobHashToId[oldJobHash])
		}
	}
	s.scheduledJobs.jobHashes = newHashes
	s.scheduledJobs.jobHashToId = newJobHashToId
	return nil
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
	_, err = s.cron.AddFunc("@every 5m", s.enqueueTask(sdkUtils.CleanUpPostgresqlTask))
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
	_, err = s.cron.AddFunc("@every 12h", s.enqueueTask(sdkUtils.SyncRegistryTask))
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
	_, err = s.cron.AddFunc("@every 60m", s.enqueueTask(sdkUtils.CachePostureProviders))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 30s", s.enqueueTask(sdkUtils.LinkCloudResourceTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 30s", s.enqueueTask(sdkUtils.LinkNodesTask))
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
	s.enqueueTask(sdkUtils.CachePostureProviders)()
}

func (s *Scheduler) Run() {
	s.cron.Run()
}

func (s *Scheduler) enqueueScheduledTask(schedule postgresqlDb.Scheduler, payload map[string]string) func() {
	log.Info().Msgf("Registering task: %s, %s", schedule.Description, schedule.CronExpr)
	return func() {
		log.Info().Msgf("Enqueuing task: %s, %s", schedule.Description, schedule.CronExpr)
		metadata := map[string]string{directory.NamespaceKey: string(directory.NonSaaSDirKey)}
		message := map[string]interface{}{"action": schedule.Action, "id": schedule.ID, "payload": payload, "description": schedule.Description}
		messageJson, _ := json.Marshal(message)
		err := utils.PublishNewJob(s.tasksPublisher, metadata, sdkUtils.ScheduledTasks, messageJson)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
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
