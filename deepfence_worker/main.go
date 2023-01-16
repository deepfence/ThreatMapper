package main

import (
	"os"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronscheduler"
	"github.com/kelseyhightower/envconfig"
)

type config struct {
	Debug                 bool     `default:"false"`
	Mode                  string   `default:"worker" required:"true"`
	MetricsPort           string   `default:"8181" split_words:"true"`
	KafkaBrokers          []string `default:"deepfence-kafka-broker:9092" required:"true" split_words:"true"`
	KafkaTopicPartitions  int32    `default:"1" split_words:"true"`
	KafkaTopicReplicas    int16    `default:"1" split_words:"true"`
	KafkaTopicRetentionMs string   `default:"86400000" split_words:"true"`
}

func main() {
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

	// check connection to kafka broker
	err = utils.CheckKafkaConn(cfg.KafkaBrokers)
	if err != nil {
		log.Error().Msg(err.Error())
		os.Exit(1)
	}
	log.Info().Msgf("connection successful to kafka brokers %v", cfg.KafkaBrokers)

	switch cfg.Mode {
	case "ingester":
		log.Info().Msg("Starting ingester")
		if err := startIngester(cfg); err != nil {
			log.Error().Msg(err.Error())
			os.Exit(1)
		}
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
		log.Fatal().Msgf("unknown mode %s", cfg.Mode)
	}
}
