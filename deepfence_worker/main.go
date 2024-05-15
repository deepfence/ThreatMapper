package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path"
	"runtime"
	"syscall"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/controls"
	cs "github.com/deepfence/ThreatMapper/deepfence_worker/cronscheduler"
	"github.com/deepfence/ThreatMapper/deepfence_worker/processors"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/kelseyhightower/envconfig"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/jaeger"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	tracesdk "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
	"go.opentelemetry.io/otel/trace/noop"

	wtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
)

func main() {

	log.Info().Msgf("\n version: %s\n commit: %s\n build-time: %s\n",
		wtils.Version, wtils.Commit, wtils.BuildTime)

	var cfg wtils.Config
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
		_ = log.Initialize(zerolog.LevelDebugValue)
	} else {
		_ = log.Initialize(zerolog.LevelInfoValue)
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

	if cfg.Debug {
		runtime.SetBlockProfileRate(1)
		runtime.SetMutexProfileFraction(1)
	}

	// new router
	router := chi.NewRouter()
	// profiler, enabled in debug mode
	if cfg.Debug {
		router.Mount("/debug", middleware.Profiler())
	}
	// metrics
	router.Handle("/metrics", promhttp.HandlerFor(NewMetrics(cfg.Mode), promhttp.HandlerOpts{EnableOpenMetrics: true}))

	srv := &http.Server{Addr: "0.0.0.0:" + cfg.MetricsPort, Handler: router}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error().Msgf("Server listen failed: %s", err)
		}
	}()

	switch cfg.Mode {
	case "ingester":
		log.Info().Msg("Starting ingester")
		ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
		ingester, err := processors.NewIngester(directory.NonSaaSDirKey, cfg, cancel)
		if err != nil {
			log.Fatal().Msg(err.Error())
		}
		ingester.Start(ctx)
		// wait for shutdown
		<-ctx.Done()

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
		go cs.InitFileServerDatabase()
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

	telemetryEnabled := os.Getenv("DEEPFENCE_TELEMETRY_ENABLED") != "false"

	if telemetryEnabled {
		telemetryHost := utils.GetEnvOrDefault("DEEPFENCE_TELEMETRY_HOST", "deepfence-telemetry")
		telemetryPort := utils.GetEnvOrDefault("DEEPFENCE_TELEMETRY_PORT", "14268")
		telemetryEndpoint := fmt.Sprintf("http://%s:%s/api/traces", telemetryHost, telemetryPort)

		log.Info().Msgf("sending traces to endpoint %s", telemetryEndpoint)

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

	} else {
		log.Info().Msgf("setting up noop tracer provider")
		// set a noop tracer provider
		otel.SetTracerProvider(noop.NewTracerProvider())
	}

	otel.SetTextMapPropagator(
		propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}),
	)

	return nil
}
