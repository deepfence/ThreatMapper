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
	workerUtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/twmb/franz-go/pkg/kgo"
)

type worker struct {
	wml watermill.LoggerAdapter
	cfg config
	mux *message.Router
}

type NoPublisherTask struct {
	Task            string
	TaskCallback    func(*message.Message) error
	Handler         *message.Handler
	Subscriber      message.Subscriber
	InactiveCounter int
}

// For thread safety, Below map should only be accessed:
// - From the main() during the initial startup
// - From the pollHandlers() during runtime
var HandlerMap map[string]*NoPublisherTask

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

func (w *worker) AddNoPublisherHandler(task string,
	taskCallback func(*message.Message) error,
	shouldPoll bool) error {

	subscriber, err := subscribe(task, w.cfg.KafkaBrokers, w.wml)
	if err != nil {
		return err
	}
	hdlr := w.mux.AddNoPublisherHandler(
		task,
		task,
		subscriber,
		telemetryCallbackWrapper(task, taskCallback),
	)
	if shouldPoll {
		HandlerMap[task] = &NoPublisherTask{task, taskCallback, hdlr, subscriber, 0}
	}

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

// Routine to poll the liveliness of the Handlers for topics regsitered with
// HandlerMap
func (w *worker) pollHandlers() {
	ticker := time.NewTicker(30 * time.Second)
	flag := true
	threshold := 30
	for {
		select {
		case <-ticker.C:
			cronjobData := cronjobs.GetTopicData()
			var resetTopicList []*NoPublisherTask
			for topic, task := range HandlerMap {
				var sub *kafka.Subscriber
				sub = task.Subscriber.(*kafka.Subscriber)
				svrOffset, err := sub.PartitionOffset(task.Task)
				if err != nil {
					log.Info().Msgf("PartitionOffset error: %v", err)
					continue
				}

				msgOffset, found := cronjobData[topic]
				if !found {
					continue
				}

				maxDelta := int64(1)
				inactiveFlag := false
				for id, _ := range svrOffset {
					if _, ok := msgOffset[id]; ok {
						delta := svrOffset[id] - msgOffset[id]
						if delta > maxDelta {
							inactiveFlag = true
							break
						}
					}
				}

				if inactiveFlag == true {
					task.InactiveCounter++
					log.Info().Msgf("Increasing InactiveCounter for topic: %s, counter: %d",
						topic, task.InactiveCounter)
				} else {
					task.InactiveCounter = 0
				}

				if task.InactiveCounter < threshold {
					continue
				}

				if flag == true {
					resetTopicList = append(resetTopicList, task)
				}
			}

			for _, task := range resetTopicList {
				log.Info().Msgf("Initiating restart of inactive handler for topic: %s", task.Task)
				task.Handler.Stop()
				//This select is to make sure the handler has actually stopped
				select {
				case _, ok := <-task.Handler.Stopped():
					if !ok {
						log.Info().Msgf("Successfully stopped handler for topic: %s", task.Task)
						break
					}
				}

				//Below check is required as the handler is supposed to be stopped and
				//cleaned up from the list when we this channel is closed.
				//But actully the channel is first closed and than the handler is removed from the routers list
				//and that could result in a condition where we might start the new handler while the old
				//one is not yet removed from the routers list
				for true {
					snapshot := w.mux.Handlers()
					if _, ok := snapshot[task.Task]; !ok {
						log.Info().Msgf("Successfully deleted handler from router for topic: %s", task.Task)
						break
					}
					time.Sleep(1 * time.Second)
				}

				w.AddNoPublisherHandler(task.Task, task.TaskCallback, true)
				w.mux.RunHandlers(context.Background())
				log.Info().Msgf("Restarted handler for topic: %s", task.Task)
			}
		}
	}
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
		Logger: wml,
	}

	mux.AddMiddleware(
		middleware.CorrelationID,
		middleware.NewThrottle(20, time.Second).Middleware,
		retry.Middleware,
		workerUtils.Recoverer,
	)

	HandlerMap = make(map[string]*NoPublisherTask)

	cronjobs.TopicData = make(map[string]kafka.PartitionOffset)

	worker := NewWorker(wml, cfg, mux)

	// sbom
	worker.AddNoPublisherHandler(utils.ScanSBOMTask, sbom.NewSBOMScanner(ingestC).ScanSBOM, false)

	worker.AddHandler(utils.GenerateSBOMTask, sbom.NewSbomGenerator(ingestC).GenerateSbom,
		utils.ScanSBOMTask, publisher)

	worker.AddNoPublisherHandler(utils.SetUpGraphDBTask, cronjobs.ApplyGraphDBStartup, false)

	worker.AddNoPublisherHandler(utils.CleanUpGraphDBTask, cronjobs.CleanUpDB, true)

	worker.AddNoPublisherHandler(utils.ComputeThreatTask, cronjobs.ComputeThreat, true)

	worker.AddNoPublisherHandler(utils.RetryFailedScansTask, cronjobs.RetryScansDB, true)

	worker.AddNoPublisherHandler(utils.RetryFailedUpgradesTask, cronjobs.RetryUpgradeAgent, false)

	worker.AddNoPublisherHandler(utils.CleanUpPostgresqlTask, cronjobs.CleanUpPostgresDB, true)

	worker.AddNoPublisherHandler(utils.CleanupDiagnosisLogs, cronjobs.CleanUpDiagnosisLogs, false)

	worker.AddNoPublisherHandler(utils.CheckAgentUpgradeTask, cronjobs.CheckAgentUpgrade, true)

	worker.AddNoPublisherHandler(utils.TriggerConsoleActionsTask, cronjobs.TriggerConsoleControls, true)

	worker.AddNoPublisherHandler(utils.ScheduledTasks, cronjobs.RunScheduledTasks, false)

	worker.AddNoPublisherHandler(utils.SyncRegistryTask, cronjobs.SyncRegistry, false)

	worker.AddNoPublisherHandler(utils.SecretScanTask,
		secretscan.NewSecretScanner(ingestC).StartSecretScan, false)

	worker.AddNoPublisherHandler(utils.StopSecretScanTask,
		secretscan.NewSecretScanner(ingestC).StopSecretScan, false)

	worker.AddNoPublisherHandler(utils.MalwareScanTask,
		malwarescan.NewMalwareScanner(ingestC).StartMalwareScan, false)

	worker.AddNoPublisherHandler(utils.StopMalwareScanTask,
		malwarescan.NewMalwareScanner(ingestC).StopMalwareScan, false)

	worker.AddNoPublisherHandler(utils.CloudComplianceTask, cronjobs.AddCloudControls, true)

	worker.AddNoPublisherHandler(utils.CachePostureProviders, cronjobs.CachePostureProviders, true)

	worker.AddNoPublisherHandler(utils.SendNotificationTask, cronjobs.SendNotifications, true)

	worker.AddNoPublisherHandler(utils.ReportGeneratorTask, reports.GenerateReport, false)

	worker.AddNoPublisherHandler(utils.ReportCleanUpTask, cronjobs.CleanUpReports, true)

	worker.AddNoPublisherHandler(utils.LinkCloudResourceTask, cronjobs.LinkCloudResources, true)

	worker.AddNoPublisherHandler(utils.LinkNodesTask, cronjobs.LinkNodes, true)

	go worker.pollHandlers()

	log.Info().Msg("Starting the consumer")
	if err = worker.Run(context.Background()); err != nil {
		cancel()
		return err
	}
	cancel()
	return nil
}

// func LogErrorWrapper(wrapped func(*message.Message) error) func(*message.Message) error {
// 	return func(msg *message.Message) error {
// 		err := wrapped(msg)
// 		if err != nil {
// 			log.Error().Msgf("Cron job err: %v", err)
// 		}
// 		return nil
// 	}
// }

// func LogErrorsWrapper(wrapped func(*message.Message) ([]*message.Message, error)) func(*message.Message) ([]*message.Message, error) {
// 	return func(msg *message.Message) ([]*message.Message, error) {
// 		msgs, err := wrapped(msg)
// 		if err != nil {
// 			log.Error().Msgf("Cron job err: %v", err)
// 			return nil, nil
// 		}
// 		return msgs, nil
// 	}
// }
