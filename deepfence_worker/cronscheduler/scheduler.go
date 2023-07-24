package cronscheduler

import (
	"context"
	"encoding/json"
	stdLogger "log"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	sdkUtils "github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_utils/vulnerability_db"
	"github.com/deepfence/ThreatMapper/deepfence_worker/utils"
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
		cron: cron.New(
			cron.WithSeconds(),
			cron.WithLocation(time.UTC),
			cron.WithLogger(cron.VerbosePrintfLogger(logger)),
		),
		tasksPublisher: tasksPublisher,
		scheduledJobs: ScheduledJobs{
			jobHashToId: make(map[string]cron.EntryID),
			jobHashes:   []string{},
		},
	}
	directory.ForEachNamespace(func(ctx context.Context) (string, error) {
		return "scheduler addJobs", scheduler.addJobs(ctx)
	})
	directory.ForEachNamespace(func(ctx context.Context) (string, error) {
		return "scheduler startImmediately", scheduler.startImmediately(ctx)
	})
	go scheduler.updateScheduledJobs()
	return scheduler, nil
}

func (s *Scheduler) updateScheduledJobs() {
	directory.ForEachNamespace(func(ctx context.Context) (string, error) {
		return "Add scheduled jobs", s.addScheduledJobs(ctx)
	})

	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		directory.ForEachNamespace(func(ctx context.Context) (string, error) {
			return "Add scheduled jobs", s.addScheduledJobs(ctx)
		})
	}
}

func (s *Scheduler) addScheduledJobs(ctx context.Context) error {
	// Get scheduled tasks
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

	namespace, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}
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
		jobId, err := s.cron.AddFunc(schedule.CronExpr, s.enqueueScheduledTask(namespace, schedule, payload))
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

func (s *Scheduler) addJobs(ctx context.Context) error {
	namespace, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}
	log.Info().Msg("Register cronjobs")
	// Documentation: https://pkg.go.dev/github.com/robfig/cron#hdr-Usage
	_, err = s.cron.AddFunc("@every 30s", s.enqueueTask(namespace, sdkUtils.TriggerConsoleActionsTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 120s", s.enqueueTask(namespace, sdkUtils.CleanUpGraphDBTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 120s", s.enqueueTask(namespace, sdkUtils.ComputeThreatTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 120s", s.enqueueTask(namespace, sdkUtils.RetryFailedScansTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 10m", s.enqueueTask(namespace, sdkUtils.RetryFailedUpgradesTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 5m", s.enqueueTask(namespace, sdkUtils.CleanUpPostgresqlTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 60m", s.enqueueTask(namespace, sdkUtils.CleanupDiagnosisLogs))
	if err != nil {
		return err
	}
	// Adding CloudComplianceTask only to ensure data is ingested if task fails on startup, Retry to be handled by watermill
	_, err = s.cron.AddFunc("@every 60m", s.enqueueTask(namespace, sdkUtils.CloudComplianceTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 60m", s.enqueueTask(namespace, sdkUtils.CheckAgentUpgradeTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 12h", s.enqueueTask(namespace, sdkUtils.SyncRegistryTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 30s", s.enqueueTask(namespace, sdkUtils.SendNotificationTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 60m", s.enqueueTask(namespace, sdkUtils.ReportCleanUpTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 60m", s.enqueueTask(namespace, sdkUtils.CachePostureProviders))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 30s", s.enqueueTask(namespace, sdkUtils.LinkCloudResourceTask))
	if err != nil {
		return err
	}
	_, err = s.cron.AddFunc("@every 30s", s.enqueueTask(namespace, sdkUtils.LinkNodesTask))
	if err != nil {
		return err
	}
	// download updated vulnerability database
	_, err = s.cron.AddFunc("@every 120m", vulnerability_db.DownloadDatabase)
	if err != nil {
		return err
	}
	return nil
}

func (s *Scheduler) startImmediately(ctx context.Context) error {
	namespace, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}
	// initialize database
	go initDatabase(ctx)
	go initMinio()

	log.Info().Msgf("Start immediate cronjobs for namespace %s", namespace)
	s.enqueueTask(namespace, sdkUtils.SetUpGraphDBTask)()
	s.enqueueTask(namespace, sdkUtils.CheckAgentUpgradeTask)()
	s.enqueueTask(namespace, sdkUtils.SyncRegistryTask)()
	s.enqueueTask(namespace, sdkUtils.CloudComplianceTask)()
	s.enqueueTask(namespace, sdkUtils.ReportCleanUpTask)()
	s.enqueueTask(namespace, sdkUtils.CachePostureProviders)()

	return nil
}

func (s *Scheduler) Run() {
	s.cron.Run()
}

func (s *Scheduler) enqueueScheduledTask(namespace directory.NamespaceID, schedule postgresqlDb.Scheduler, payload map[string]string) func() {
	log.Info().Msgf("Registering task: %s, %s for namespace %s", schedule.Description, schedule.CronExpr, namespace)
	return func() {
		log.Info().Msgf("Enqueuing task: %s, %s for namespace %s",
			schedule.Description, schedule.CronExpr, namespace)
		metadata := map[string]string{directory.NamespaceKey: string(namespace)}
		message := map[string]interface{}{
			"action":      schedule.Action,
			"id":          schedule.ID,
			"payload":     payload,
			"description": schedule.Description,
		}
		messageJson, _ := json.Marshal(message)
		err := utils.PublishNewJob(s.tasksPublisher, metadata, sdkUtils.ScheduledTasks, messageJson)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func (s *Scheduler) enqueueTask(namespace directory.NamespaceID, task string) func() {
	log.Info().Msgf("Registering task: %s for namespace %s", task, namespace)
	return func() {
		log.Info().Msgf("Enqueuing task: %s for namespace %s", task, namespace)
		metadata := map[string]string{directory.NamespaceKey: string(namespace)}
		err := utils.PublishNewJob(s.tasksPublisher, metadata, task,
			[]byte(strconv.FormatInt(sdkUtils.GetTimestamp(), 10)))
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}
