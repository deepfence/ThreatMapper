package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/malwarescan"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/reports"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/sbom"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/scans"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/secretscan"
	wtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/hibiken/asynq"
	"github.com/twmb/franz-go/pkg/kgo"
)

type Worker struct {
	cfg       config
	mux       *asynq.ServeMux
	srv       *asynq.Server
	namespace directory.NamespaceID
}

func (w *Worker) Run(ctx context.Context) error {
	if err := w.srv.Run(w.mux); err != nil {
		log.Fatal().Msgf("could not run server: %v", err)
	}
	return nil
}

func telemetryCallbackWrapper(task string, taskCallback wtils.WorkerHandler) wtils.WorkerHandler {
	return func(ctx context.Context, t *asynq.Task) error {
		span := telemetry.NewSpan(context.Background(), "workerjobs", task)
		defer span.End()
		err := taskCallback(ctx, t)
		if err != nil {
			span.EndWithErr(err)
		}
		return err
	}
}

func contextInjectorCallbackWrapper(
	namespace directory.NamespaceID,
	taskCallback wtils.WorkerHandler) wtils.WorkerHandler {
	return func(ctx context.Context, t *asynq.Task) error {
		return taskCallback(
			context.WithValue(ctx, directory.NamespaceKey, namespace),
			t)
	}
}

func skipRetryCallbackWrapper(taskCallback wtils.WorkerHandler) wtils.WorkerHandler {
	return func(ctx context.Context, t *asynq.Task) error {
		err := taskCallback(ctx, t)
		if err != nil {
			return fmt.Errorf("%v: %w", err, asynq.SkipRetry)
		}
		return nil
	}
}

func (w *Worker) AddHandler(
	task string,
	taskCallback wtils.WorkerHandler,
) error {
	w.mux.HandleFunc(
		task,
		contextInjectorCallbackWrapper(w.namespace,
			telemetryCallbackWrapper(task, taskCallback)),
	)
	return nil
}

// CronJobHandler do not retry on failure
// The job will simply be tried again later on.
func (w *Worker) AddCronJobHandler(
	task string,
	taskCallback wtils.WorkerHandler,
) error {
	w.mux.HandleFunc(
		task,
		skipRetryCallbackWrapper(
			contextInjectorCallbackWrapper(w.namespace,
				telemetryCallbackWrapper(task, taskCallback))),
	)
	return nil
}

func NewWorker(ns directory.NamespaceID, cfg config) (Worker, context.CancelFunc, error) {

	kafkaCtx, cancel := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM)

	// this for sending messages to kafka
	ingestC := make(chan *kgo.Record, 10000)
	go utils.StartKafkaProducer(kafkaCtx, cfg.KafkaBrokers, ingestC)

	srv := asynq.NewServer(
		asynq.RedisClientOpt{
			Addr:     fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
			DB:       cfg.RedisDbNumber,
			Password: cfg.RedisPassword,
		},
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
			ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
				retried, _ := asynq.GetRetryCount(ctx)
				maxRetry, _ := asynq.GetMaxRetry(ctx)
				if retried >= maxRetry {
					err = fmt.Errorf("retry exhausted for task %s: %w", task.Type(), err)
				}
				log.Error().Msgf("worker task error: %v", err)
			}),
		},
	)

	mux := asynq.NewServeMux()
	mux.Use(
		wtils.Recoverer,
	)

	worker := Worker{
		cfg:       cfg,
		mux:       mux,
		srv:       srv,
		namespace: ns,
	}

	worker.AddCronJobHandler(utils.CleanUpGraphDBTask, cronjobs.CleanUpDB)

	worker.AddCronJobHandler(utils.ComputeThreatTask, cronjobs.ComputeThreat)

	worker.AddCronJobHandler(utils.RetryFailedScansTask, cronjobs.RetryScansDB)

	worker.AddCronJobHandler(utils.RetryFailedUpgradesTask, cronjobs.RetryUpgradeAgent)

	worker.AddCronJobHandler(utils.CleanUpPostgresqlTask, cronjobs.CleanUpPostgresDB)

	worker.AddCronJobHandler(utils.CleanupDiagnosisLogs, cronjobs.CleanUpDiagnosisLogs)

	worker.AddCronJobHandler(utils.CheckAgentUpgradeTask, cronjobs.CheckAgentUpgrade)

	worker.AddCronJobHandler(utils.TriggerConsoleActionsTask, cronjobs.TriggerConsoleControls)

	worker.AddCronJobHandler(utils.ScheduledTasks, cronjobs.RunScheduledTasks)

	worker.AddCronJobHandler(utils.SyncRegistryTask, cronjobs.SyncRegistry)

	worker.AddCronJobHandler(utils.CloudComplianceTask, cronjobs.AddCloudControls)

	worker.AddCronJobHandler(utils.CachePostureProviders, cronjobs.CachePostureProviders)

	worker.AddCronJobHandler(utils.SendNotificationTask, cronjobs.SendNotifications)

	worker.AddCronJobHandler(utils.ReportGeneratorTask, reports.GenerateReport)

	worker.AddCronJobHandler(utils.ReportCleanUpTask, cronjobs.CleanUpReports)

	worker.AddCronJobHandler(utils.LinkCloudResourceTask, cronjobs.LinkCloudResources)

	worker.AddCronJobHandler(utils.LinkNodesTask, cronjobs.LinkNodes)

	// sbom
	worker.AddHandler(utils.ScanSBOMTask, sbom.NewSBOMScanner(ingestC).ScanSBOM)

	worker.AddHandler(utils.GenerateSBOMTask, sbom.NewSbomGenerator(ingestC).GenerateSbom)

	worker.AddHandler(utils.SecretScanTask, secretscan.NewSecretScanner(ingestC).StartSecretScan)

	worker.AddHandler(utils.StopSecretScanTask, secretscan.NewSecretScanner(ingestC).StopSecretScan)

	worker.AddHandler(utils.MalwareScanTask, malwarescan.NewMalwareScanner(ingestC).StartMalwareScan)

	worker.AddHandler(utils.StopMalwareScanTask, malwarescan.NewMalwareScanner(ingestC).StopMalwareScan)

	worker.AddHandler(utils.StopVulnerabilityScanTask, sbom.StopVulnerabilityScan)

	worker.AddHandler(utils.UpdateCloudResourceScanStatusTask, scans.UpdateCloudResourceScanStatus)

	worker.AddHandler(utils.UpdatePodScanStatusTask, scans.UpdatePodScanStatus)

	return worker, cancel, nil
}
