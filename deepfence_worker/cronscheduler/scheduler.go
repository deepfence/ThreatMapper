package cronscheduler

import (
	"context"
	"encoding/json"
	stdLogger "log"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	sdkUtils "github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_utils/vulnerability_db"
	"github.com/robfig/cron/v3"
)

type ScheduledJobs struct {
	jobHashToId map[string]cron.EntryID
	jobHashes   []string
}

type CronJobs struct {
	jobIDs []cron.EntryID
}

type Jobs struct {
	CronJobs           map[directory.NamespaceID]CronJobs
	CronJobsMutex      sync.Mutex
	ScheduledJobs      map[directory.NamespaceID]ScheduledJobs
	ScheduledJobsMutex sync.Mutex
}

type Scheduler struct {
	cron *cron.Cron
	jobs Jobs
}

func NewScheduler() (*Scheduler, error) {
	logger := stdLogger.New(os.Stdout, "cron: ", stdLogger.LstdFlags)
	scheduler := &Scheduler{
		cron: cron.New(
			cron.WithSeconds(),
			cron.WithLocation(time.UTC),
			cron.WithLogger(cron.VerbosePrintfLogger(logger)),
		),
		jobs: Jobs{
			CronJobs:      make(map[directory.NamespaceID]CronJobs),
			ScheduledJobs: make(map[directory.NamespaceID]ScheduledJobs),
		},
	}
	return scheduler, nil
}

func (s *Scheduler) Init() {
	// download updated vulnerability database
	_, err := s.cron.AddFunc("@every 120m", vulnerability_db.DownloadDatabase)
	if err != nil {
		return
	}

	directory.ForEachNamespace(func(ctx context.Context) (string, error) {
		return "scheduler addJobs", s.AddJobs(ctx)
	})

	// Periodically update scheduled jobs for each tenant from postgresql
	go s.updateScheduledJobs()
}

func (s *Scheduler) AddJobs(ctx context.Context) error {
	err := s.addCronJobs(ctx)
	if err != nil {
		return err
	}
	err = s.startInitJobs(ctx)
	if err != nil {
		return err
	}
	err = s.addScheduledJobs(ctx)
	if err != nil {
		return err
	}
	return nil
}

func (s *Scheduler) RemoveJobs(ctx context.Context) error {
	namespace, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}

	s.jobs.CronJobsMutex.Lock()
	if cronJobs, ok := s.jobs.CronJobs[namespace]; ok {
		for _, jobID := range cronJobs.jobIDs {
			s.cron.Remove(jobID)
		}
		delete(s.jobs.CronJobs, namespace)
	}
	s.jobs.CronJobsMutex.Unlock()

	s.jobs.ScheduledJobsMutex.Lock()
	if scheduledJobs, ok := s.jobs.ScheduledJobs[namespace]; ok {
		for _, jobID := range scheduledJobs.jobHashToId {
			s.cron.Remove(jobID)
		}
		delete(s.jobs.ScheduledJobs, namespace)
	}
	s.jobs.ScheduledJobsMutex.Unlock()
	return nil
}

func (s *Scheduler) updateScheduledJobs() {
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		directory.ForEachNamespace(func(ctx context.Context) (string, error) {
			return "Update scheduled jobs", s.addScheduledJobs(ctx)
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

	s.jobs.ScheduledJobsMutex.Lock()
	defer s.jobs.ScheduledJobsMutex.Unlock()

	namespace, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}

	scheduledJobs, ok := s.jobs.ScheduledJobs[namespace]
	if !ok {
		scheduledJobs = ScheduledJobs{
			jobHashToId: make(map[string]cron.EntryID),
			jobHashes:   []string{},
		}
	}

	var newHashes []string
	newJobHashToId := make(map[string]cron.EntryID)
	for _, schedule := range schedules {
		jobHash := sdkUtils.GetScheduledJobHash(schedule)
		if sdkUtils.InSlice(jobHash, scheduledJobs.jobHashes) {
			newHashes = append(newHashes, jobHash)
			newJobHashToId[jobHash] = scheduledJobs.jobHashToId[jobHash]
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
	for _, oldJobHash := range scheduledJobs.jobHashes {
		if !sdkUtils.InSlice(oldJobHash, scheduledJobs.jobHashes) {
			s.cron.Remove(scheduledJobs.jobHashToId[oldJobHash])
		}
	}

	scheduledJobs.jobHashes = newHashes
	scheduledJobs.jobHashToId = newJobHashToId
	s.jobs.ScheduledJobs[namespace] = scheduledJobs
	return nil
}

func (s *Scheduler) addCronJobs(ctx context.Context) error {
	namespace, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}
	log.Info().Msgf("Register cronjobs for namespace %v", namespace)

	s.jobs.CronJobsMutex.Lock()
	defer s.jobs.CronJobsMutex.Unlock()
	var jobIDs []cron.EntryID

	// Documentation: https://pkg.go.dev/github.com/robfig/cron#hdr-Usage
	var jobID cron.EntryID
	jobID, err = s.cron.AddFunc("@every 30s", s.enqueueTask(namespace, sdkUtils.TriggerConsoleActionsTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 120s", s.enqueueTask(namespace, sdkUtils.CleanUpGraphDBTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 120s", s.enqueueTask(namespace, sdkUtils.ComputeThreatTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 120s", s.enqueueTask(namespace, sdkUtils.RetryFailedScansTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 10m", s.enqueueTask(namespace, sdkUtils.RetryFailedUpgradesTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 5m", s.enqueueTask(namespace, sdkUtils.CleanUpPostgresqlTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 60m", s.enqueueTask(namespace, sdkUtils.CleanupDiagnosisLogs))
	if err != nil {
		return err
	}
	// Adding CloudComplianceTask only to ensure data is ingested if task fails on startup, Retry to be handled by watermill
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 60m", s.enqueueTask(namespace, sdkUtils.CloudComplianceTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 60m", s.enqueueTask(namespace, sdkUtils.CheckAgentUpgradeTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 12h", s.enqueueTask(namespace, sdkUtils.SyncRegistryTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 30s", s.enqueueTask(namespace, sdkUtils.SendNotificationTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 60m", s.enqueueTask(namespace, sdkUtils.ReportCleanUpTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 15m", s.enqueueTask(namespace, sdkUtils.CachePostureProviders))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 30s", s.enqueueTask(namespace, sdkUtils.LinkCloudResourceTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 30s", s.enqueueTask(namespace, sdkUtils.LinkNodesTask))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	s.jobs.CronJobs[namespace] = CronJobs{jobIDs: jobIDs}

	return nil
}

func (s *Scheduler) startInitJobs(ctx context.Context) error {
	namespace, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}

	// initialize sql database
	if err := initSqlDatabase(ctx); err != nil {
		log.Error().Err(err).Msgf("failed to initialize sql database for namespace %s", namespace)
	}

	// initialize neo4j database
	if err := initNeo4jDatabase(ctx); err != nil {
		log.Error().Err(err).Msgf("failed to initialize neo4j database for namespace %s", namespace)
	}

	log.Info().Msgf("Start immediate cronjobs for namespace %s", namespace)
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
		message := map[string]interface{}{
			"action":      schedule.Action,
			"id":          schedule.ID,
			"payload":     payload,
			"description": schedule.Description,
		}
		messageJson, _ := json.Marshal(message)
		worker, err := directory.Worker(directory.NewContextWithNameSpace(namespace))
		if err != nil {
			log.Error().Msg(err.Error())
			return
		}
		err = worker.Enqueue(sdkUtils.ScheduledTasks, messageJson)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func (s *Scheduler) enqueueTask(namespace directory.NamespaceID, task string) func() {
	log.Info().Msgf("Registering task: %s for namespace %s", task, namespace)
	return func() {
		log.Info().Msgf("Enqueuing task: %s for namespace %s", task, namespace)
		worker, err := directory.Worker(directory.NewContextWithNameSpace(namespace))
		if err != nil {
			log.Error().Msg(err.Error())
			return
		}
		err = worker.Enqueue(task, []byte(strconv.FormatInt(sdkUtils.GetTimestamp(), 10)))
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}
