package main

import (
	"context"
	"flag"
	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/ThreeDotsLabs/watermill/message/router/plugin"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronscheduler"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks"
	"github.com/kelseyhightower/envconfig"
	"github.com/twmb/franz-go/pkg/kgo"
	"time"
)

type config struct {
	KafkaBrokers []string `default:"deepfence-kafka-broker:9092" required:"true" split_words:"true"`
	Debug        bool     `default:"false"`
}

var workerMode = flag.String("mode", "worker", "worker or scheduler")

func main() {
	flag.Parse()

	var cfg config
	var err error
	var wml watermill.LoggerAdapter
	err = envconfig.Process("DEEPFENCE", &cfg)
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	log.Info().Msgf("config: %+v", cfg)

	if cfg.Debug {
		log.Initialize("debug")
		wml = watermill.NewStdLogger(true, false)
	} else {
		log.Initialize("info")
		wml = watermill.NewStdLogger(false, false)
	}

	switch *workerMode {
	case "worker":
		log.Info().Msg("Starting worker")
		err := startWorker(wml, cfg)
		if err != nil {
			log.Error().Msg(err.Error())
			return
		}
	case "scheduler":
		log.Info().Msg("Starting scheduler")
		tasksPublisher, err := kafka.NewPublisher(
			kafka.PublisherConfig{
				Brokers:   cfg.KafkaBrokers,
				Marshaler: kafka.DefaultMarshaler{},
			},
			wml,
		)
		if err != nil {
			log.Error().Msg(err.Error())
			return
		}
		defer tasksPublisher.Close()
		scheduler, err := cronscheduler.NewScheduler(tasksPublisher)
		if err != nil {
			log.Error().Msg(err.Error())
			return
		}
		scheduler.Run()
	default:
		log.Fatal().Msgf("unknown mode %s", *workerMode)
	}
}

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
	}

	mux.AddMiddleware(
		middleware.Recoverer,
		middleware.NewThrottle(10, time.Second).Middleware,
		retryMiddleware.Middleware,
		middleware.CorrelationID,
	)

	subs, err := subscribe("parse_sbom", cfg.KafkaBrokers, wml)
	if err != nil {
		cancel()
		return err
	}
	mux.AddNoPublisherHandler(
		"parse_sbom",
		"tasks_parse_sbom",
		subs,
		tasks.NewSBOMParser(ingestC).ParseSBOM,
	)

	subs, err = subscribe(utils.CleanUpGraphDBTask, cfg.KafkaBrokers, wml)
	if err != nil {
		cancel()
		return err
	}
	mux.AddNoPublisherHandler(
		utils.CleanUpGraphDBTask,
		utils.CleanUpGraphDBTask,
		subs,
		cronjobs.CleanUpDB,
	)

	subs, err = subscribe(utils.RetryFailedScansTask, cfg.KafkaBrokers, wml)
	if err != nil {
		cancel()
		return err
	}
	mux.AddNoPublisherHandler(
		utils.RetryFailedScansTask,
		utils.RetryFailedScansTask,
		subs,
		cronjobs.RetryScansDB,
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
