package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/malwarescan"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/reports"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/sbom"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/secretscan"
	workerUtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/hibiken/asynq"
	"github.com/twmb/franz-go/pkg/kgo"
)

type worker struct {
	cfg       config
	mux       *asynq.ServeMux
	srv       *asynq.Server
	namespace directory.NamespaceID
}

func NewWorker(namespace directory.NamespaceID, srv *asynq.Server, cfg config, mux *asynq.ServeMux) worker {
	return worker{srv: srv, cfg: cfg, mux: mux, namespace: namespace}
}

func (w *worker) Run(ctx context.Context) error {
	if err := w.srv.Run(w.mux); err != nil {
		log.Fatal().Msgf("could not run server: %v", err)
	}
	return nil
}

func telemetryCallbackWrapper(task string, taskCallback workerUtils.WorkerHandler) workerUtils.WorkerHandler {
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

func contextInjectorCallbackWrapper(namespace directory.NamespaceID, taskCallback workerUtils.WorkerHandler) workerUtils.WorkerHandler {
	return func(ctx context.Context, t *asynq.Task) error {
		ctx = context.WithValue(ctx, directory.NamespaceKey, namespace)
		return taskCallback(ctx, t)
	}
}

func (w *worker) AddHandler(
	task string,
	taskCallback workerUtils.WorkerHandler,
) error {
	w.mux.HandleFunc(
		task,
		contextInjectorCallbackWrapper(w.namespace, telemetryCallbackWrapper(task, taskCallback)),
	)
	return nil
}

func startWorker(cfg config) error {

	ctx, cancel := signal.NotifyContext(context.Background(),
		os.Interrupt, syscall.SIGTERM)
	defer cancel()

	// create if any topics is missing
	err := utils.CreateMissingTopics(
		cfg.KafkaBrokers, utils.Tasks,
		cfg.KafkaTopicPartitionsTasks, cfg.KafkaTopicReplicas, cfg.KafkaTopicRetentionMs,
	)
	if err != nil {
		log.Error().Msgf("%v", err)
	}

	// this for sending messages to kafka
	ingestC := make(chan *kgo.Record, 10000)
	go utils.StartKafkaProducer(ctx, cfg.KafkaBrokers, ingestC)

	mux := asynq.NewServeMux()

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: cfg.RedisAddr},
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
		},
	)

	retry := workerUtils.Retry{
		MaxRetries:          3,
		InitialInterval:     time.Second * 5,
		MaxInterval:         time.Second * 60,
		Multiplier:          1.5,
		MaxElapsedTime:      0,
		RandomizationFactor: 0.25,
		OnRetryHook: func(retryNum int, delay time.Duration) {
			log.Info().Msgf("retry=%d delay=%s", retryNum, delay)
		},
	}

	mux.Use(
		retry.Middleware,
		workerUtils.Recoverer,
	)

	worker := NewWorker(directory.NonSaaSDirKey, srv, cfg, mux)

	// sbom
	worker.AddHandler(utils.ScanSBOMTask, sbom.NewSBOMScanner(ingestC).ScanSBOM)

	worker.AddHandler(utils.GenerateSBOMTask, sbom.NewSbomGenerator(ingestC).GenerateSbom)

	worker.AddHandler(utils.CleanUpGraphDBTask, cronjobs.CleanUpDB)

	worker.AddHandler(utils.ComputeThreatTask, cronjobs.ComputeThreat)

	worker.AddHandler(utils.RetryFailedScansTask, cronjobs.RetryScansDB)

	worker.AddHandler(utils.RetryFailedUpgradesTask, cronjobs.RetryUpgradeAgent)

	worker.AddHandler(utils.CleanUpPostgresqlTask, cronjobs.CleanUpPostgresDB)

	worker.AddHandler(utils.CleanupDiagnosisLogs, cronjobs.CleanUpDiagnosisLogs)

	worker.AddHandler(utils.CheckAgentUpgradeTask, cronjobs.CheckAgentUpgrade)

	worker.AddHandler(utils.TriggerConsoleActionsTask, cronjobs.TriggerConsoleControls)

	worker.AddHandler(utils.ScheduledTasks, cronjobs.RunScheduledTasks)

	worker.AddHandler(utils.SyncRegistryTask, cronjobs.SyncRegistry)

	worker.AddHandler(utils.SecretScanTask,
		secretscan.NewSecretScanner(ingestC).StartSecretScan)

	worker.AddHandler(utils.StopSecretScanTask,
		secretscan.NewSecretScanner(ingestC).StopSecretScan)

	worker.AddHandler(utils.MalwareScanTask,
		malwarescan.NewMalwareScanner(ingestC).StartMalwareScan)

	worker.AddHandler(utils.StopMalwareScanTask,
		malwarescan.NewMalwareScanner(ingestC).StopMalwareScan)

	worker.AddHandler(utils.CloudComplianceTask, cronjobs.AddCloudControls)

	worker.AddHandler(utils.CachePostureProviders, cronjobs.CachePostureProviders)

	worker.AddHandler(utils.SendNotificationTask, cronjobs.SendNotifications)

	worker.AddHandler(utils.ReportGeneratorTask, reports.GenerateReport)

	worker.AddHandler(utils.ReportCleanUpTask, cronjobs.CleanUpReports)

	worker.AddHandler(utils.LinkCloudResourceTask, cronjobs.LinkCloudResources)

	worker.AddHandler(utils.LinkNodesTask, cronjobs.LinkNodes)

	worker.AddHandler(utils.StopVulnerabilityScanTask, sbom.StopVulnerabilityScan)

	log.Info().Msg("Starting the worker")
	err = worker.Run(context.Background())
	return err
}
