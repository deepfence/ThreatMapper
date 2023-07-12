package main

import (
	"os"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/controls"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronscheduler"
	"github.com/kelseyhightower/envconfig"
	"github.com/rs/zerolog"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/jaeger"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	tracesdk "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
)

type config struct {
	Debug                     bool     `default:"false"`
	Mode                      string   `default:"worker" required:"true"`
	MetricsPort               string   `default:"8181" split_words:"true"`
	KafkaBrokers              []string `default:"deepfence-kafka-broker:9092" required:"true" split_words:"true"`
	KafkaTopicPartitions      int32    `default:"1" split_words:"true"`
	KafkaTopicReplicas        int16    `default:"1" split_words:"true"`
	KafkaTopicRetentionMs     string   `default:"86400000" split_words:"true"`
	KafkaTopicPartitionsTasks int32    `default:"3" split_words:"true"`
}

// build info
var (
	Version   string
	Commit    string
	BuildTime string
)

func main() {

	log.Info().Msgf("\n version: %s\n commit: %s\n build-time: %s\n",
		Version, Commit, BuildTime)

	var cfg config
	var err error
	var wml watermill.LoggerAdapter
	err = envconfig.Process("DEEPFENCE", &cfg)
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	log.Info().Msgf("config: %+v", cfg)

	if cfg.Debug {
		log.Initialize(zerolog.LevelDebugValue)
		wml = NewZerologWaterMillAdapter(true, false)
	} else {
		log.Initialize(zerolog.LevelInfoValue)
		wml = NewZerologWaterMillAdapter(false, false)
	}

	// check connection to kafka broker
	err = utils.CheckKafkaConn(cfg.KafkaBrokers)
	if err != nil {
		log.Fatal().Err(err).Msg("Kafka connection check failed")
	}
	log.Info().Msgf("connection successful to kafka brokers %v", cfg.KafkaBrokers)

	err = initializeTelemetry(cfg.Mode)
	if err != nil {
		log.Fatal().Err(err).Msg("Telemetry initialization failed")
	}

	// task publisher
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

	switch cfg.Mode {
	case "ingester":
		log.Info().Msg("Starting ingester")
		if err := startIngester(cfg); err != nil {
			log.Error().Msg(err.Error())
			os.Exit(1)
		}
	case "worker":
		log.Info().Msg("Starting worker")
		if err := controls.ConsoleActionSetup(tasksPublisher); err != nil {
			log.Error().Msg(err.Error())
			return
		}
		err := startWorker(wml, cfg)
		if err != nil {
			log.Error().Msg(err.Error())
			return
		}
	case "scheduler":
		log.Info().Msg("Starting scheduler")
		time.Sleep(10 * time.Second)
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

func initializeTelemetry(mode string) error {
	exp, err := jaeger.New(
		jaeger.WithCollectorEndpoint(
			jaeger.WithEndpoint("http://deepfence-telemetry:14268/api/traces"),
		),
	)
	if err != nil {
		return err
	}
	tp := tracesdk.NewTracerProvider(
		tracesdk.WithBatcher(exp),
		tracesdk.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String("deepfence-"+mode),
			attribute.String("environment", "dev"),
		)),
	)

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(
		propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}),
	)
	return nil
}
