package cronscheduler

import (
	"context"
	"encoding/json"
	"errors"
	stdLogger "log"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
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
	cron            *cron.Cron
	jobs            Jobs
	tasksMaxRetries asynq.Option
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
		tasksMaxRetries: utils.TasksMaxRetries(),
	}
	return scheduler, nil
}

func (s *Scheduler) Init() {

	directory.ForEachNamespace(func(ctx context.Context) (string, error) {
		return "scheduler addJobs", s.AddJobs(ctx)
	})

	// Periodically update scheduled jobs for each tenant from postgresql
	go s.updateScheduledJobs()
}

func (s *Scheduler) AddJobs(ctx context.Context) error {
	ctx, span := telemetry.NewSpan(ctx, "cronjobs", "add-jobs")
	defer span.End()

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
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		directory.ForEachNamespace(func(ctx context.Context) (string, error) {
			ctx, span := telemetry.NewSpan(ctx, "cronjobs", "update-scheduled-jobs")
			defer span.End()
			return "Update scheduled jobs", s.addScheduledJobs(ctx)
		})
	}
}

func (s *Scheduler) addScheduledJobs(ctx context.Context) error {

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "cronjobs", "add-scheduled-jobs")
	defer span.End()

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
		jobHash := utils.GetScheduledJobHash(schedule)
		if utils.InSlice(jobHash, scheduledJobs.jobHashes) {
			newHashes = append(newHashes, jobHash)
			newJobHashToId[jobHash] = scheduledJobs.jobHashToId[jobHash]
			continue
		}
		payload := schedule.Payload
		jobId, err := s.cron.AddFunc(schedule.CronExpr, s.enqueueScheduledTask(namespace, schedule, payload))
		if err != nil {
			return err
		}
		newHashes = append(newHashes, jobHash)
		newJobHashToId[jobHash] = jobId
	}
	for _, oldJobHash := range scheduledJobs.jobHashes {
		if !utils.InSlice(oldJobHash, newHashes) {
			log.Info().Msgf("Removing job from cron: %s", oldJobHash)
			s.cron.Remove(scheduledJobs.jobHashToId[oldJobHash])
		}
	}

	scheduledJobs.jobHashes = newHashes
	scheduledJobs.jobHashToId = newJobHashToId
	s.jobs.ScheduledJobs[namespace] = scheduledJobs
	return nil
}

func (s *Scheduler) addCronJobs(ctx context.Context) error {

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "cronjobs", "add-cron-jobs")
	defer span.End()

	namespace, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}
	log.Info().Msg("Register cronjobs")

	s.jobs.CronJobsMutex.Lock()
	defer s.jobs.CronJobsMutex.Unlock()
	var jobIDs []cron.EntryID

	// Documentation: https://pkg.go.dev/github.com/robfig/cron#hdr-Usage

	var jobID cron.EntryID

	// based on neo4j connectivity status pause/unpause queues
	jobID, err = s.cron.AddJob("@every 30s", NewAsynqQueueState(namespace, time.Second*10))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 30s",
		s.enqueueTask(namespace, utils.TriggerConsoleActionsTask, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 120s",
		s.enqueueTask(namespace, utils.CleanUpGraphDBTask, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 120s",
		s.enqueueTask(namespace, utils.ComputeThreatTask, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 120s",
		s.enqueueTask(namespace, utils.RetryFailedScansTask, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 10m",
		s.enqueueTask(namespace, utils.RetryFailedUpgradesTask, true, utils.DefaultTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 5m",
		s.enqueueTask(namespace, utils.CleanUpPostgresqlTask, true, utils.DefaultTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 60m",
		s.enqueueTask(namespace, utils.CleanupDiagnosisLogs, true, utils.DefaultTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	// Adding CloudComplianceTask only to ensure data is ingested if task fails on startup
	jobID, err = s.cron.AddFunc("@every 60m",
		s.enqueueTask(namespace, utils.CloudComplianceControlsTask, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 60m",
		s.enqueueTask(namespace, utils.CheckAgentUpgradeTask, true))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 60m",
		s.enqueueTask(namespace, utils.CheckCloudScannerAgentUpgradeTask, true))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 12h",
		s.enqueueTask(namespace, utils.SyncRegistryTask, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	// dont want unique tasks for SendNotification
	jobID, err = s.cron.AddFunc("@every 60s",
		s.enqueueTask(namespace, utils.SendNotificationTask, false, utils.LowTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 30m",
		s.enqueueTask(namespace, utils.ReportCleanUpTask, true, utils.DefaultTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 15m",
		s.enqueueTask(namespace, utils.CachePostureProviders, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 30s",
		s.enqueueTask(namespace, utils.LinkCloudResourceTask, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 30s",
		s.enqueueTask(namespace, utils.LinkNodesTask, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 1h",
		s.enqueueTask(namespace, utils.AsynqDeleteAllArchivedTasks, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 12h",
		s.enqueueTask(namespace, utils.RedisRewriteAOF, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 2h", s.enqueueTask(namespace, utils.UpdateLicenseTask, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 1h", s.enqueueTask(namespace, utils.ReportLicenseUsageTask, true, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	jobID, err = s.cron.AddFunc("@every 5h", s.enqueueTask(namespace, utils.ThreatIntelUpdateTask, false, utils.CritialTaskOpts()...))
	if err != nil {
		return err
	}
	jobIDs = append(jobIDs, jobID)

	s.jobs.CronJobs[namespace] = CronJobs{jobIDs: jobIDs}

	return nil
}

func (s *Scheduler) startInitJobs(ctx context.Context) error {

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "cronjobs", "start-init-jobs")
	defer span.End()

	namespace, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return err
	}

	// initialize sql database
	if err := initSqlDatabase(ctx); err != nil {
		log.Error().Err(err).Msg("failed to initialize sql database")
	}

	// initialize neo4j database
	if err := initNeo4jDatabase(ctx); err != nil {
		log.Error().Err(err).Msg("failed to initialize neo4j database")
	}

	log.Info().Msgf("Start immediate cronjobs for namespace %s", namespace)
	s.enqueueTask(namespace, utils.CheckAgentUpgradeTask, true)()
	s.enqueueTask(namespace, utils.CheckCloudScannerAgentUpgradeTask, true)()
	s.enqueueTask(namespace, utils.SyncRegistryPostgresNeo4jTask, true, utils.CritialTaskOpts()...)()
	s.enqueueTask(namespace, utils.ReportCleanUpTask, true, utils.CritialTaskOpts()...)()
	s.enqueueTask(namespace, utils.CachePostureProviders, true, utils.CritialTaskOpts()...)()
	s.enqueueTask(namespace, utils.RedisRewriteAOF, true, utils.CritialTaskOpts()...)()
	s.enqueueTask(namespace, utils.AsynqDeleteAllArchivedTasks, true, utils.CritialTaskOpts()...)()

	s.enqueueTask(namespace, utils.ThreatIntelUpdateTask, false, utils.CritialTaskOpts()...)()

	return nil
}

func (s *Scheduler) Run() {
	s.cron.Run()
}

func (s *Scheduler) enqueueScheduledTask(namespace directory.NamespaceID,
	schedule postgresqlDb.Scheduler, payload json.RawMessage) func() {
	log.Info().Msgf("Registering task: %s, %s for namespace %s", schedule.Description, schedule.CronExpr, namespace)
	return func() {
		ctx := directory.NewContextWithNameSpace(namespace)

		log := log.WithCtx(ctx)

		log.Info().Msgf("Enqueuing task: %s, %s for namespace %s",
			schedule.Description, schedule.CronExpr, namespace)

		message := map[string]interface{}{
			"action":      schedule.Action,
			"id":          schedule.ID,
			"payload":     payload,
			"description": schedule.Description,
			"is_system":   schedule.IsSystem,
		}
		messageJson, _ := json.Marshal(message)
		worker, err := directory.Worker(ctx)
		if err != nil {
			log.Error().Msg(err.Error())
			return
		}
		err = worker.Enqueue(utils.ScheduledTasks, messageJson, utils.DefaultTaskOpts()...)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func (s *Scheduler) enqueueTask(namespace directory.NamespaceID, task string, unique bool, taskOpts ...asynq.Option) func() {
	return func() {
		ctx := directory.NewContextWithNameSpace(namespace)

		log := log.WithCtx(ctx)

		log.Info().Msgf("Enqueuing task %s", task)

		worker, err := directory.Worker(ctx)
		if err != nil {
			log.Error().Msg(err.Error())
			return
		}

		if !unique {
			err = worker.Enqueue(task, []byte(strconv.FormatInt(utils.GetTimestamp(), 10)), taskOpts...)
		} else {
			err = worker.EnqueueUnique(task, []byte(strconv.FormatInt(utils.GetTimestamp(), 10)), taskOpts...)
		}
		if errors.Is(err, asynq.ErrTaskIDConflict) {
			log.Warn().Msgf("unique task true, skip enqueue task %s %s", task, err.Error())
		} else if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}
