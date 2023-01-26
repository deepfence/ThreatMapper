package main

import (
	"context"
	"crypto/aes"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	stdlog "log"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"time"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/deepfence/ThreatMapper/deepfence_server/apiDocs"
	"github.com/deepfence/ThreatMapper/deepfence_server/constants/common"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registrysync"
	"github.com/deepfence/ThreatMapper/deepfence_server/router"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	postgresql_db "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/twmb/franz-go/pkg/kgo"
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

	openApiDocs := apiDocs.InitializeOpenAPIReflector()
	initializeOpenApiDocs(openApiDocs)

	if *exportOpenapiDocsPath != "" {
		if *exportOpenapiDocsPath != filepath.Clean(*exportOpenapiDocsPath) {
			log.Fatal().Msgf("File path %s is not valid", *exportOpenapiDocsPath)
		}
		openApiYaml, err := openApiDocs.Yaml()
		if err != nil {
			log.Fatal().Msg(err.Error())
		}
		err = os.WriteFile(*exportOpenapiDocsPath, openApiYaml, 0666)
		if err != nil {
			log.Fatal().Msg(err.Error())
		}
		log.Info().Msgf("OpenAPI yaml saved at %s", *exportOpenapiDocsPath)
		os.Exit(0)
	}

	config, err := initialize()
	if err != nil {
		log.Fatal().Msg(err.Error())
	}
	config.JwtSecret, err = initializeDatabase()
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	err = initializeKafka()
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	log.Info().Msg("generating aes setting")
	err = initializeAES()
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	log.Info().Msg("syncing images from registries")
	// todo: do this in cron
	err = registrysync.Sync()
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	log.Info().Msg("starting deepfence-server")

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
	go utils.StartKafkaProducer(ctx, strings.Split(kafkaBrokers, ","), ingestC)

	wml := watermill.NewStdLogger(false, false)

	rand.Seed(time.Now().Unix())

	// task publisher
	publisher, err := kafka.NewPublisher(
		kafka.PublisherConfig{
			Brokers:   strings.Split(kafkaBrokers, ","),
			Marshaler: kafka.DefaultMarshaler{},
		},
		wml,
	)
	if err != nil {
		panic(err)
	}
	defer publisher.Close()

	err = router.SetupRoutes(mux,
		config.HttpListenEndpoint, config.JwtSecret,
		*serveOpenapiDocs, ingestC, publisher, openApiDocs,
	)
	if err != nil {
		log.Error().Msg(err.Error())
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

func initializeAES() error {
	// set aes_secret in setting table, if !exists
	// TODO
	// generate aes and aes-iv
	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}

	_, err = pgClient.GetSetting(ctx, common.AES_SECRET)
	if err != nil {
		key := make([]byte, 32) // 32 bytes for AES-256
		iv := make([]byte, aes.BlockSize)
		_, err = rand.Read(key)
		if err != nil {
			return err
		}

		_, err = rand.Read(iv)
		if err != nil {
			return err
		}

		aesValue := &model.SettingValue{
			Label:       "AES Encryption Setting",
			Description: "AES Encryption Key-IV pair",
			Value: map[string]string{
				"aes_iv":  hex.EncodeToString(iv),
				"aes_key": hex.EncodeToString(key),
			},
		}

		rawAES, err := json.Marshal(aesValue)
		if err != nil {
			return err
		}
		rawMessageAES := json.RawMessage(rawAES)

		_, err = pgClient.CreateSetting(ctx, postgresql_db.CreateSettingParams{
			Key:           common.AES_SECRET,
			Value:         rawMessageAES,
			IsVisibleOnUi: false,
		})
		if err != nil {
			return err
		}
	}
	return nil
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

func initializeOpenApiDocs(openApiDocs *apiDocs.OpenApiDocs) {
	openApiDocs.AddUserAuthOperations()
	openApiDocs.AddUserOperations()
	openApiDocs.AddGraphOperations()
	openApiDocs.AddLookupOperations()
	openApiDocs.AddControlsOperations()
	openApiDocs.AddIngestersOperations()
	openApiDocs.AddScansOperations()
	openApiDocs.AddDiagnosisOperations()
	openApiDocs.AddCloudNodeOperations()
}

func initializeKafka() error {
	kafkaBrokers = os.Getenv("DEEPFENCE_KAFKA_BROKERS")
	if kafkaBrokers == "" {
		kafkaBrokers = "deepfence-kafka-broker:9092"
	}

	opts := []kgo.Opt{
		kgo.SeedBrokers(strings.Split(kafkaBrokers, ",")...),
		kgo.WithLogger(utils.KgoLogger),
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
