package main

import (
	"context"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/ThreeDotsLabs/watermill/message/router/plugin"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks/sbom"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/twmb/franz-go/pkg/kgo"
)

func startWorker(wml watermill.LoggerAdapter, cfg config) error {
	// this for sending messages to kafka
	ingestC := make(chan *kgo.Record, 10000)
	ctx, cancel := context.WithCancel(context.Background())
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

	// sbom
	addTerminalHandler(wml, cfg, mux, utils.ScanSBOMTask, sbom.NewSBOMScanner(ingestC).ScanSBOM)

	subscribe_generate_sbom, err := subscribe(utils.GenerateSBOMTask, cfg.KafkaBrokers, wml)
	if err != nil {
		cancel()
		return err
	}
	mux.AddHandler(
		utils.GenerateSBOMTask,
		utils.GenerateSBOMTask,
		subscribe_generate_sbom,
		utils.ScanSBOMTask,
		publisher,
		sbom.NewSbomGenerator(ingestC).GenerateSbom,
	)

	addTerminalHandler(wml, cfg, mux, utils.CleanUpGraphDBTask, cronjobs.CleanUpDB)

	addTerminalHandler(wml, cfg, mux, utils.RetryFailedScansTask, cronjobs.RetryScansDB)

	addTerminalHandler(wml, cfg, mux, utils.RetryFailedUpgradesTask, cronjobs.RetryUpgradeAgent)

	addTerminalHandler(wml, cfg, mux, utils.CleanUpPostgresqlTask, cronjobs.CleanUpPostgresDB)

	addTerminalHandler(wml, cfg, mux, utils.CheckAgentUpgradeTask, cronjobs.CheckAgentUpgrade)

	addTerminalHandler(wml, cfg, mux, utils.TriggerConsoleActionsTask, cronjobs.TriggerConsoleControls)

	addTerminalHandler(wml, cfg, mux, utils.SyncRegistryTask, cronjobs.SyncRegistry)

	log.Info().Msg("Starting the consumer")
	if err = mux.Run(context.Background()); err != nil {
		cancel()
		return err
	}
	cancel()
	return nil
}

func subscribe(consumerGroup string, brokers []string, logger watermill.LoggerAdapter) (message.Subscriber, error) {

	subscriberConf := kafka.DefaultSaramaSubscriberConfig()
	subscriberConf.Consumer.Offsets.AutoCommit.Enable = true

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

func addTerminalHandler(
	wml watermill.LoggerAdapter,
	cfg config,
	mux *message.Router,
	task string,
	callback func(*message.Message) error) error {

	subscriber, err := subscribe(utils.CleanUpGraphDBTask, cfg.KafkaBrokers, wml)
	if err != nil {
		return err
	}
	mux.AddNoPublisherHandler(
		task,
		task,
		subscriber,
		callback,
	)
	return nil
}
