package main

import (
	"context"
	"flag"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"

	"github.com/deepfence/ThreatMapper/deepfence_server/router"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

var (
	verbosity        = flag.String("verbose", "info", "log level")
	serveOpenapiDocs = flag.Bool("api-docs", true, "serve openapi documentation")
	kafkaBrokers     string
)

type Config struct {
	HttpListenEndpoint string
}

func main() {
	flag.Parse()

	config, err := initialize()
	if err != nil {
		log.Fatal().Msg(err.Error())
	}
	err = initializeDatabase()
	if err != nil {
		log.Fatal().Msg(err.Error())
	}
	err = initializeKafka()
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	log.Info().Msg("starting deepfence-server")

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	ingestChan := make(chan *kgo.Record, 10000)

	ctx, cancel := context.WithCancel(context.Background())
	go startKafkaProducer(ctx, kafkaBrokers, ingestChan)

	err = router.SetupRoutes(r, config.HttpListenEndpoint, *serveOpenapiDocs, ingestChan)
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}

	httpServer := http.Server{Addr: config.HttpListenEndpoint, Handler: r}

	idleConnectionsClosed := make(chan struct{})
	go func() {
		sigint := make(chan os.Signal, 1)
		signal.Notify(sigint, os.Interrupt)
		<-sigint
		if err := httpServer.Shutdown(context.Background()); err != nil {
			log.Error().Msgf("http server shutdown error: %v", err)
		}
		close(idleConnectionsClosed)
	}()

	if err := httpServer.ListenAndServe(); err != http.ErrServerClosed {
		log.Error().Msgf("http server ListenAndServe error: %v", err)
		return
	}

	<-idleConnectionsClosed
	cancel()

	log.Info().Msg("deepfence-server stopped")
}

func initialize() (Config, error) {
	// logger
	log.Initialize(*verbosity)

	httpListenEndpoint := os.Getenv("HTTP_LISTEN_ENDPOINT")
	if httpListenEndpoint == "" {
		httpListenEndpoint = "8080"
	}

	return Config{
		HttpListenEndpoint: ":" + httpListenEndpoint,
	}, nil
}

func initializeDatabase() error {
	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}
	roles, err := pgClient.GetRoles(ctx)
	if err != nil {
		return err
	}
	if len(roles) == 0 {
		_, err = pgClient.CreateRole(ctx, model.AdminRole)
		if err != nil {
			return err
		}
		_, err = pgClient.CreateRole(ctx, model.UserRole)
		if err != nil {
			return err
		}
		_, err = pgClient.CreateRole(ctx, model.ReadOnlyRole)
		if err != nil {
			return err
		}
	}
	return nil
}

func initializeKafka() error {
	kafkaBrokers = os.Getenv("KAFKA_BROKERS")
	if kafkaBrokers == "" {
		kafkaBrokers = "deepfence-kafka-broker:9092"
	}

	opts := []kgo.Opt{
		kgo.SeedBrokers(strings.Split(kafkaBrokers, ",")...),
		kgo.WithLogger(kgoLogger),
	}

	kc, err := kgo.NewClient(opts...)
	if err != nil {
		return err
	}
	defer kc.Close()

	if err := kc.Ping(context.Background()); err != nil {
		return err
	}

	log.Info().Msg("connection to kafka brokers successful")

	return nil
}

var kgoLogger kgo.Logger = kgo.BasicLogger(
	os.Stdout,
	kgo.LogLevelInfo,
	func() string { return "[" + getCurrentTime() + "]" + " " },
)

func getCurrentTime() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000") + "Z"
}

func startKafkaProducer(
	ctx context.Context,
	brokers string,
	ingestChan chan *kgo.Record,
) {

	opts := []kgo.Opt{
		kgo.SeedBrokers(strings.Split(brokers, ",")...),
		kgo.WithLogger(kgoLogger),
	}

	kClient, err := kgo.NewClient(opts...)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	defer kClient.Close()

	if err := kClient.Ping(ctx); err != nil {
		log.Error().Msg(err.Error())
	}

	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("stop producing to kafka")
			if err := kClient.Flush(context.Background()); err != nil {
				log.Error().Msg(err.Error())
			}
			return

		case record := <-ingestChan:
			kClient.Produce(
				ctx,
				record,
				func(r *kgo.Record, err error) {
					if err != nil {
						log.Error().Msgf(
							"failed to produce record %s record: %v",
							err, record,
						)
					}
				},
			)
		}
	}
}
