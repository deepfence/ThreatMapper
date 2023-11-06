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

var (
	DefaultQueues = map[string]int{
		utils.Q_CRITICAL: 6,
		utils.Q_DEFAULT:  3,
		utils.Q_LOW:      1,
	}
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

func (w *Worker) AddRetryableHandler(
	task string,
	taskCallback wtils.WorkerHandler,
) {
	w.mux.HandleFunc(
		task,
		contextInjectorCallbackWrapper(w.namespace,
			telemetryCallbackWrapper(task, taskCallback)),
	)
}

// CronJobHandler do not retry on failure
// The job will simply be tried again later on.
func (w *Worker) AddOneShotHandler(
	task string,
	taskCallback wtils.WorkerHandler,
) {
	w.mux.HandleFunc(
		task,
		skipRetryCallbackWrapper(
			contextInjectorCallbackWrapper(w.namespace,
				telemetryCallbackWrapper(task, taskCallback))),
	)
}

func NewWorker(ns directory.NamespaceID, cfg config) (Worker, context.CancelFunc, error) {

	kafkaCtx, cancel := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM)

	// this for sending messages to kafka
	ingestC := make(chan *kgo.Record, 10000)
	go utils.StartKafkaProducer(kafkaCtx, cfg.KafkaBrokers, ingestC)

	// worker config
	qCfg := asynq.Config{
		StrictPriority: true,
		Concurrency:    cfg.TasksConcurrency,
		ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
			retried, _ := asynq.GetRetryCount(ctx)
			maxRetry, _ := asynq.GetMaxRetry(ctx)
			if retried >= maxRetry {
				err = fmt.Errorf("retry exhausted for task %s: %w", task.Type(), err)
			}
			log.Error().Err(err).Msgf("worker task %s, payload: %s", task.Type(), task.Payload())
		}),
	}

	if len(cfg.ProcessQueues) > 0 {
		log.Info().Msgf("process mesages from queues %s", cfg.ProcessQueues)
		processQueues := map[string]int{}
		for _, qName := range cfg.ProcessQueues {
			if val, found := DefaultQueues[qName]; found {
				processQueues[qName] = val
			} else {
				log.Error().Msgf("unknown queue name %s", qName)
			}
		}
		qCfg.Queues = processQueues
	} else {
		log.Info().Msg("process messages from all queues")
		qCfg.Queues = DefaultQueues
	}

	srv := asynq.NewServer(
		asynq.RedisClientOpt{
			Addr:     fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
			DB:       cfg.RedisDbNumber,
			Password: cfg.RedisPassword,
		},
		qCfg,
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

	worker.AddOneShotHandler(utils.CleanUpGraphDBTask, cronjobs.CleanUpDB)

	worker.AddOneShotHandler(utils.ComputeThreatTask, cronjobs.ComputeThreat)

	worker.AddOneShotHandler(utils.RetryFailedScansTask, cronjobs.RetryScansDB)

	worker.AddOneShotHandler(utils.RetryFailedUpgradesTask, cronjobs.RetryUpgradeAgent)

	worker.AddOneShotHandler(utils.CleanUpPostgresqlTask, cronjobs.CleanUpPostgresDB)

	worker.AddOneShotHandler(utils.CleanupDiagnosisLogs, cronjobs.CleanUpDiagnosisLogs)

	worker.AddOneShotHandler(utils.CheckAgentUpgradeTask, cronjobs.CheckAgentUpgrade)

	worker.AddOneShotHandler(utils.TriggerConsoleActionsTask, cronjobs.TriggerConsoleControls)

	worker.AddOneShotHandler(utils.ScheduledTasks, cronjobs.RunScheduledTasks)

	worker.AddRetryableHandler(utils.SyncRegistryTask, cronjobs.SyncRegistry)

	worker.AddRetryableHandler(utils.CloudComplianceTask, cronjobs.AddCloudControls)

	worker.AddOneShotHandler(utils.CachePostureProviders, cronjobs.CachePostureProviders)

	worker.AddOneShotHandler(utils.SendNotificationTask, cronjobs.SendNotifications)

	worker.AddRetryableHandler(utils.ReportGeneratorTask, reports.GenerateReport)

	worker.AddOneShotHandler(utils.ReportCleanUpTask, cronjobs.CleanUpReports)

	worker.AddOneShotHandler(utils.LinkCloudResourceTask, cronjobs.LinkCloudResources)

	worker.AddOneShotHandler(utils.LinkNodesTask, cronjobs.LinkNodes)

	// sbom
	worker.AddRetryableHandler(utils.ScanSBOMTask, sbom.NewSBOMScanner(ingestC).ScanSBOM)

	worker.AddOneShotHandler(utils.GenerateSBOMTask, sbom.NewSbomGenerator(ingestC).GenerateSbom)

	worker.AddOneShotHandler(utils.SecretScanTask, secretscan.NewSecretScanner(ingestC).StartSecretScan)

	worker.AddOneShotHandler(utils.StopSecretScanTask, secretscan.NewSecretScanner(ingestC).StopSecretScan)

	worker.AddOneShotHandler(utils.MalwareScanTask, malwarescan.NewMalwareScanner(ingestC).StartMalwareScan)

	worker.AddOneShotHandler(utils.StopMalwareScanTask, malwarescan.NewMalwareScanner(ingestC).StopMalwareScan)

	worker.AddOneShotHandler(utils.StopVulnerabilityScanTask, sbom.StopVulnerabilityScan)

	worker.AddRetryableHandler(utils.UpdateCloudResourceScanStatusTask, scans.UpdateCloudResourceScanStatus)

	worker.AddRetryableHandler(utils.UpdatePodScanStatusTask, scans.UpdatePodScanStatus)

	return worker, cancel, nil
}
