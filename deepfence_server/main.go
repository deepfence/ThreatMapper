package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"

	stdlog "log"

	"github.com/deepfence/ThreatMapper/deepfence_server/router"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

var (
	verbosity             = flag.String("verbose", "info", "log level")
	exportOpenapiDocsPath = flag.String("export-api-docs-path", "", "export openapi documentation to file path")
	serveOpenapiDocs      = flag.Bool("api-docs", true, "serve openapi documentation")
	enableHttpLogs        = flag.Bool("http-logs", false, "enable request logs")
	kafkaBrokers          string
)

type Config struct {
	HttpListenEndpoint string
	JwtSecret          []byte
}

func main() {
	flag.Parse()

	config, err := initialize()
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	if *exportOpenapiDocsPath == "" {
		config.JwtSecret, err = initializeDatabase()
		if err != nil {
			log.Fatal().Msg(err.Error())
		}

		err = initializeKafka()
		if err != nil {
			log.Fatal().Msg(err.Error())
		}

		log.Info().Msg("starting deepfence-server")
	} else {
		if *exportOpenapiDocsPath != filepath.Clean(*exportOpenapiDocsPath) {
			log.Fatal().Msgf("File path %s is not valid", *exportOpenapiDocsPath)
		}
	}

	mux := chi.NewRouter()
	mux.Use(middleware.Recoverer)
	if *enableHttpLogs {
		mux.Use(
			middleware.RequestLogger(
				&middleware.DefaultLogFormatter{
					Logger:  stdlog.New(&log.LogInfoWriter{}, "", 0),
					NoColor: true},
			),
		)
	}

	ingestC := make(chan *kgo.Record, 10000)

	ctx, cancel := context.WithCancel(context.Background())
	go startKafkaProducer(ctx, kafkaBrokers, ingestC)

	initializeCronJobs()

	dfHandler, err := router.SetupRoutes(mux,
		config.HttpListenEndpoint, config.JwtSecret,
		*serveOpenapiDocs, ingestC,
	)
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}

	if *exportOpenapiDocsPath != "" {
		openApiYaml, err := dfHandler.OpenApiDocs.Yaml()
		if err != nil {
			return
		}
		err = os.WriteFile(*exportOpenapiDocsPath, openApiYaml, 0666)
		if err != nil {
			log.Error().Msg(err.Error())
			return
		}
		log.Info().Msgf("OpenAPI yaml saved at %s", *exportOpenapiDocsPath)
		return
	}

	httpServer := http.Server{
		Addr:     config.HttpListenEndpoint,
		Handler:  mux,
		ErrorLog: stdlog.New(&log.LogErrorWriter{}, "", 0),
	}

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

func initializeCronJobs() {
	ctx := directory.NewContextWithNameSpace(directory.NonSaaSDirKey)
	err := directory.PeriodicWorkerEnqueue(ctx, directory.CleanUpGraphDBTaskID, "@every 120s")
	if err != nil {
		log.Fatal().Msgf("Could not enqueue graph clean up task: %v", err)
	}

	err = directory.PeriodicWorkerEnqueue(ctx, directory.ScanRetryGraphDBTaskID, "@every 120s")
	if err != nil {
		log.Fatal().Msgf("Could not enqueue scans retry task: %v", err)
	}
}

func initialize() (*Config, error) {
	// logger
	log.Initialize(*verbosity)

	httpListenEndpoint := os.Getenv("DEEPFENCE_HTTP_LISTEN_ENDPOINT")
	if httpListenEndpoint == "" {
		httpListenEndpoint = "8080"
	}

	return &Config{
		HttpListenEndpoint: ":" + httpListenEndpoint,
	}, nil
}

func initializeDatabase() ([]byte, error) {
	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return nil, err
	}
	roles, err := pgClient.GetRoles(ctx)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	rolesConfigured := map[string]bool{model.AdminRole: false, model.StandardUserRole: false, model.ReadOnlyRole: false}
	for _, role := range roles {
		if _, ok := rolesConfigured[role.Name]; ok {
			rolesConfigured[role.Name] = true
		}
	}
	for roleName, configured := range rolesConfigured {
		if !configured {
			_, err = pgClient.CreateRole(ctx, roleName)
			if err != nil {
				return nil, err
			}
		}
	}
	jwtSecret, err := model.GetJwtSecretSetting(ctx, pgClient)
	if err != nil {
		return nil, err
	}
	return jwtSecret, nil
}

func initializeKafka() error {
	kafkaBrokers = os.Getenv("DEEPFENCE_KAFKA_BROKERS")
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

// kafka client logger
var (
	kgoLogger kgo.Logger = kgo.BasicLogger(&log.LogInfoWriter{}, kgo.LogLevelInfo, nil)
)

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
