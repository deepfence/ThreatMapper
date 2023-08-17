package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/ThreeDotsLabs/watermill/message/router/plugin"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/malwarescan"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/reports"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/sbom"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/secretscan"
	"github.com/twmb/franz-go/pkg/kgo"
)

type worker struct {
	wml watermill.LoggerAdapter
	cfg config
	mux *message.Router
}

func NewWorker(wml watermill.LoggerAdapter, cfg config, mux *message.Router) worker {
	return worker{wml: wml, cfg: cfg, mux: mux}
}

func (w *worker) Run(ctx context.Context) error {
	return w.mux.Run(ctx)
}

func telemetryCallbackWrapper(task string, taskCallback func(*message.Message) error) func(*message.Message) error {
	return func(m *message.Message) error {
		span := telemetry.NewSpan(context.Background(), "workerjobs", task)
		defer span.End()
		err := taskCallback(m)
		if err != nil {
			span.EndWithErr(err)
		}
		return err
	}
}

func (w *worker) AddNoPublisherHandler(
	task string,
	taskCallback func(*message.Message) error,
) error {
	subscriber, err := subscribe(task, w.cfg.KafkaBrokers, w.wml)
	if err != nil {
		return err
	}
	w.mux.AddNoPublisherHandler(
		task,
		task,
		subscriber,
		telemetryCallbackWrapper(task, taskCallback),
	)
	return nil
}

func (w *worker) AddHandler(
	task string,
	taskCallback func(msg *message.Message) ([]*message.Message, error),
	receiverTask string,
	publisher *kafka.Publisher,
) error {
	subscriber, err := subscribe(task, w.cfg.KafkaBrokers, w.wml)
	if err != nil {
		return err
	}
	w.mux.AddHandler(
		task,
		task,
		subscriber,
		receiverTask,
		publisher,
		taskCallback,
	)
	return nil
}

func subscribe(consumerGroup string, brokers []string, logger watermill.LoggerAdapter) (message.Subscriber, error) {

	subscriberConf := kafka.DefaultSaramaSubscriberConfig()
	subscriberConf.Consumer.Offsets.AutoCommit.Enable = true

	subscriberConf.Consumer.Group.Session.Timeout = 20 * time.Second
	subscriberConf.Consumer.Group.Heartbeat.Interval = 6 * time.Second
	subscriberConf.Consumer.MaxProcessingTime = 500 * time.Millisecond

	sub, err := kafka.NewSubscriber(
		kafka.SubscriberConfig{
			Brokers:               brokers,
			Unmarshaler:           kafka.DefaultMarshaler{},
			ConsumerGroup:         consumerGroup,
			OverwriteSaramaConfig: subscriberConf,
		},
		logger,
	)
	if err != nil {
		return nil, err
	}

	return sub, nil
}

func startWorker(wml watermill.LoggerAdapter, cfg config) error {

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

	// task publisher
	publisher, err := kafka.NewPublisher(
		kafka.PublisherConfig{
			Brokers:   cfg.KafkaBrokers,
			Marshaler: kafka.DefaultMarshaler{},
		},
		wml,
	)
	if err != nil {
		cancel()
		return err
	}
	defer publisher.Close()

	// task router
	mux, err := message.NewRouter(message.RouterConfig{}, wml)
	if err != nil {
		cancel()
		return err
	}

	mux.AddPlugin(plugin.SignalsHandler)

	// Retried disabled in favor of neo4j scheduling
	//retryMiddleware := middleware.Retry{
	//	MaxRetries:          3,
	//	InitialInterval:     time.Second * 10,
	//	MaxInterval:         time.Second * 120,
	//	Multiplier:          1.5,
	//	MaxElapsedTime:      0,
	//	RandomizationFactor: 0.5,
	//	OnRetryHook: func(retryNum int, delay time.Duration) {
	//		log.Info().Msgf("retry=%d delay=%s", retryNum, delay)
	//	},
	//	Logger: wml,
	//}

	mux.AddMiddleware(
		middleware.Recoverer,
		middleware.NewThrottle(10, time.Second).Middleware,
		middleware.CorrelationID,
	)

	worker := NewWorker(wml, cfg, mux)

	// sbom
	worker.AddNoPublisherHandler(utils.ScanSBOMTask, sbom.NewSBOMScanner(ingestC).ScanSBOM)
	worker.AddHandler(utils.GenerateSBOMTask, sbom.NewSbomGenerator(ingestC).GenerateSbom,
		utils.ScanSBOMTask, publisher)

	worker.AddNoPublisherHandler(utils.SetUpGraphDBTask, cronjobs.ApplyGraphDBStartup)

	worker.AddNoPublisherHandler(utils.CleanUpGraphDBTask, cronjobs.CleanUpDB)

	worker.AddNoPublisherHandler(utils.ComputeThreatTask, cronjobs.ComputeThreat)

	worker.AddNoPublisherHandler(utils.RetryFailedScansTask, cronjobs.RetryScansDB)

	worker.AddNoPublisherHandler(utils.RetryFailedUpgradesTask, cronjobs.RetryUpgradeAgent)

	worker.AddNoPublisherHandler(utils.CleanUpPostgresqlTask, cronjobs.CleanUpPostgresDB)

	worker.AddNoPublisherHandler(utils.CleanupDiagnosisLogs, cronjobs.CleanUpDiagnosisLogs)

	worker.AddNoPublisherHandler(utils.CheckAgentUpgradeTask, cronjobs.CheckAgentUpgrade)

	worker.AddNoPublisherHandler(utils.TriggerConsoleActionsTask, cronjobs.TriggerConsoleControls)

	worker.AddNoPublisherHandler(utils.ScheduledTasks, cronjobs.RunScheduledTasks)

	worker.AddNoPublisherHandler(utils.SyncRegistryTask, cronjobs.SyncRegistry)

	worker.AddNoPublisherHandler(utils.SecretScanTask, secretscan.NewSecretScanner(ingestC).StartSecretScan)
	worker.AddNoPublisherHandler(utils.StopSecretScanTask, secretscan.NewSecretScanner(ingestC).StopSecretScan)

	worker.AddNoPublisherHandler(utils.MalwareScanTask, malwarescan.NewMalwareScanner(ingestC).StartMalwareScan)
	worker.AddNoPublisherHandler(utils.StopMalwareScanTask, malwarescan.NewMalwareScanner(ingestC).StopMalwareScan)

	worker.AddNoPublisherHandler(utils.CloudComplianceTask, cronjobs.AddCloudControls)

	worker.AddNoPublisherHandler(utils.CachePostureProviders, cronjobs.CachePostureProviders)

	worker.AddNoPublisherHandler(utils.SendNotificationTask, cronjobs.SendNotifications)

	worker.AddNoPublisherHandler(utils.ReportGeneratorTask, reports.GenerateReport)

	worker.AddNoPublisherHandler(utils.ReportCleanUpTask, cronjobs.CleanUpReports)

	worker.AddNoPublisherHandler(utils.LinkCloudResourceTask, cronjobs.LinkCloudResources)

	worker.AddNoPublisherHandler(utils.LinkNodesTask, cronjobs.LinkNodes)

	log.Info().Msg("Starting the consumer")
	if err = worker.Run(context.Background()); err != nil {
		cancel()
		return err
	}
	cancel()
	return nil
}
