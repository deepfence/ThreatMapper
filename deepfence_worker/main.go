package main

import (
	"context"
	"fmt"
	"os"
	"path"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/controls"
	cs "github.com/deepfence/ThreatMapper/deepfence_worker/cronscheduler"
	"github.com/kelseyhightower/envconfig"
	"github.com/rs/zerolog"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/jaeger"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	tracesdk "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"

	"net/http"
	_ "net/http/pprof"
)

type config struct {
	Debug                 bool     `default:"false"`
	Mode                  string   `default:"worker" required:"true"`
	MetricsPort           string   `default:"8181" split_words:"true"`
	KafkaBrokers          []string `default:"deepfence-kafka-broker:9092" required:"true" split_words:"true"`
	KafkaTopicPartitions  int32    `default:"1" split_words:"true"`
	KafkaTopicReplicas    int16    `default:"1" split_words:"true"`
	KafkaTopicRetentionMs string   `default:"86400000" split_words:"true"`
	RedisHost             string   `default:"deepfence-redis" required:"true" split_words:"true"`
	RedisDbNumber         int      `default:"0" split_words:"true"`
	RedisPort             string   `default:"6379" split_words:"true"`
	RedisPassword         string   `default:"" split_words:"true"`
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
	err = envconfig.Process("DEEPFENCE", &cfg)
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	dir, err := os.ReadDir("/tmp")
	if err != nil {
		log.Fatal().Msg(err.Error())
	}
	for _, d := range dir {
		os.RemoveAll(path.Join([]string{"tmp", d.Name()}...))
	}

	log.Info().Msgf("config: %+v", cfg)

	if cfg.Debug {
		log.Initialize(zerolog.LevelDebugValue)
	} else {
		log.Initialize(zerolog.LevelInfoValue)
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

	if os.Getenv("DEEPFENCE_ENABLE_PPROF") != "" {
		go func() {
			err := http.ListenAndServe("localhost:6060", nil)
			if err != nil {
				log.Error().Msgf("pprof err: %v", err)
			}
		}()
	}

	switch cfg.Mode {
	case "ingester":
		log.Info().Msg("Starting ingester")
		if err := startIngester(cfg); err != nil {
			log.Error().Msg(err.Error())
			os.Exit(1)
		}
	case "worker":
		log.Info().Msg("Starting worker")
		if err := controls.ConsoleActionSetup(); err != nil {
			log.Error().Msg(err.Error())
			return
		}
		worker, kafkaCancel, err := NewWorker(directory.NonSaaSDirKey, cfg)
		defer kafkaCancel()
		if err != nil {
			log.Fatal().Msg(err.Error())
		}
		log.Info().Msg("Starting the worker")
		err = worker.Run(context.Background())
		if err != nil {
			log.Error().Msg(err.Error())
			return
		}
	case "scheduler":
		log.Info().Msg("Starting scheduler")
		go cs.InitMinioDatabase()
		time.Sleep(10 * time.Second)
		scheduler, err := cs.NewScheduler()
		if err != nil {
			log.Error().Msg(err.Error())
			return
		}
		scheduler.Init()
		scheduler.Run()
	default:
		log.Fatal().Msgf("unknown mode %s", cfg.Mode)
	}
}

func initializeTelemetry(mode string) error {

	telemetryHost := utils.GetEnvOrDefault("DEEPFENCE_TELEMETRY_HOST", "deepfence-telemetry")
	telemetryPort := utils.GetEnvOrDefault("DEEPFENCE_TELEMETRY_PORT", "14268")
	telemetryEndpoint := fmt.Sprintf("http://%s:%s/api/traces", telemetryHost, telemetryPort)

	exp, err := jaeger.New(
		jaeger.WithCollectorEndpoint(
			jaeger.WithEndpoint(telemetryEndpoint),
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
