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
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/twmb/franz-go/pkg/kgo"
)

func startWorker(wml watermill.LoggerAdapter, cfg config) error {
	// this for sending messages to kafka
	ingestC := make(chan *kgo.Record, 10000)
	ctx, cancel := context.WithCancel(context.Background())
	go utils.StartKafkaProducer(ctx, cfg.KafkaBrokers, ingestC)

	// task router
	mux, err := message.NewRouter(message.RouterConfig{}, wml)
	if err != nil {
		cancel()
		return err
	}

	mux.AddPlugin(plugin.SignalsHandler)

	retryMiddleware := middleware.Retry{
		MaxRetries:      3,
		InitialInterval: time.Second * 10,
		Logger:          wml,
	}

	mux.AddMiddleware(
		middleware.Recoverer,
		middleware.NewThrottle(10, time.Second).Middleware,
		retryMiddleware.Middleware,
		middleware.CorrelationID,
	)

	// sbom
	subscribe_parse_sbom, err := subscribe(utils.ParseSBOMTask, cfg.KafkaBrokers, wml)
	if err != nil {
		cancel()
		return err
	}
	mux.AddNoPublisherHandler(
		utils.ParseSBOMTask,
		utils.ParseSBOMTask,
		subscribe_parse_sbom,
		tasks.NewSBOMParser(ingestC).ParseSBOM,
	)

	subscribe_cleanup_graph_db, err := subscribe(utils.CleanUpGraphDBTask, cfg.KafkaBrokers, wml)
	if err != nil {
		cancel()
		return err
	}
	mux.AddNoPublisherHandler(
		utils.CleanUpGraphDBTask,
		utils.CleanUpGraphDBTask,
		subscribe_cleanup_graph_db,
		cronjobs.CleanUpDB,
	)

	subscribe_retry_failed_scans, err := subscribe(utils.RetryFailedScansTask, cfg.KafkaBrokers, wml)
	if err != nil {
		cancel()
		return err
	}
	mux.AddNoPublisherHandler(
		utils.RetryFailedScansTask,
		utils.RetryFailedScansTask,
		subscribe_retry_failed_scans,
		cronjobs.RetryScansDB,
	)

	subscribe_retry_failed_upgrades, err := subscribe(utils.RetryFailedUpgradesTask, cfg.KafkaBrokers, wml)
	if err != nil {
		cancel()
		return err
	}
	mux.AddNoPublisherHandler(
		utils.RetryFailedUpgradesTask,
		utils.RetryFailedUpgradesTask,
		subscribe_retry_failed_upgrades,
		cronjobs.RetryUpgradeAgent,
	)

	subscribeCleanupPostgresql, err := subscribe(utils.CleanUpPostgresqlTask, cfg.KafkaBrokers, wml)
	if err != nil {
		cancel()
		return err
	}

	mux.AddNoPublisherHandler(
		utils.CleanUpPostgresqlTask,
		utils.CleanUpPostgresqlTask,
		subscribeCleanupPostgresql,
		cronjobs.CleanUpPostgresDB,
	)

	check_agent_upgrade_task, err := subscribe(utils.CheckAgentUpgradeTask, cfg.KafkaBrokers, wml)
	if err != nil {
		cancel()
		return err
	}
	mux.AddNoPublisherHandler(
		utils.CheckAgentUpgradeTask,
		utils.CheckAgentUpgradeTask,
		check_agent_upgrade_task,
		cronjobs.CheckAgentUpgrade,
	)

	sync_registry_task, err := subscribe(utils.SyncRegistryTask, cfg.KafkaBrokers, wml)
	if err != nil {
		cancel()
		return err
	}
	mux.AddNoPublisherHandler(
		utils.SyncRegistryTask,
		utils.SyncRegistryTask,
		sync_registry_task,
		cronjobs.SyncRegistry,
	)

	log.Info().Msg("Starting the consumer")
	if err = mux.Run(context.Background()); err != nil {
		cancel()
		return err
	}
	cancel()
	return nil
}

func subscribe(consumerGroup string, brokers []string, logger watermill.LoggerAdapter) (message.Subscriber, error) {
	sub, err := kafka.NewSubscriber(
		kafka.SubscriberConfig{
			Brokers:       brokers,
			Unmarshaler:   kafka.DefaultMarshaler{},
			ConsumerGroup: consumerGroup,
		},
		logger,
	)
	if err != nil {
		return nil, err
	}

	return sub, nil
}
