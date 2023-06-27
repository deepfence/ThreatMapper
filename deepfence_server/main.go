package main

import (
	"context"
	"crypto/aes"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/deepfence/ThreatMapper/deepfence_server/apiDocs"
	"github.com/deepfence/ThreatMapper/deepfence_server/constants/common"
	consolediagnosis "github.com/deepfence/ThreatMapper/deepfence_server/diagnosis/console-diagnosis"
	"github.com/deepfence/ThreatMapper/deepfence_server/handler"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/router"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/rs/zerolog"
	"github.com/twmb/franz-go/pkg/kgo"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/jaeger"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	tracesdk "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
	"golang.org/x/crypto/ssh/terminal"
)

var (
	verbosity             = flag.String("verbose", "info", "log level")
	resetPassword         = flag.Bool("reset-password", false, "reset password for a user")
	exportOpenapiDocsPath = flag.String("export-api-docs-path", "", "export openapi documentation to file path")
	serveOpenapiDocs      = flag.Bool("api-docs", true, "serve openapi documentation")
	enableHttpLogs        = flag.Bool("http-logs", false, "enable request logs")
	kafkaBrokers          string
	enable_debug          bool
)

type Config struct {
	HttpListenEndpoint     string
	InternalListenEndpoint string
	JwtSecret              []byte
	Orchestrator           string
}

func init() {
	debug := "debug"
	enable_debug = os.Getenv("DF_ENABLE_DEBUG") != ""
	if enable_debug {
		verbosity = &debug
	}
}

func main() {

	if enable_debug {
		runtime.SetBlockProfileRate(1)
		runtime.SetMutexProfileFraction(1)
	}

	flag.Parse()

	openApiDocs := apiDocs.InitializeOpenAPIReflector()
	initializeOpenApiDocs(openApiDocs)
	initializeInternalOpenApiDocs(openApiDocs)

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

	directory.ForEachNamespace(func(ctx context.Context) (string, error) {
		config.JwtSecret, err = initializeDatabase(ctx)
		if err != nil {
			log.Fatal().Msg(err.Error())
		}
		return "initializeDatabase", err
	})

	if *resetPassword == true {
		if directory.IsNonSaaSDeployment() {
			ctx := directory.NewContextWithNameSpace(directory.NonSaaSDirKey)
			err = resetUserPassword(ctx)
		} else {
			err = errors.New("option available only in self-hosted deployment")
		}
		if err != nil {
			log.Fatal().Msg(err.Error())
		}
		os.Exit(0)
	}

	err = initializeKafka()
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	log.Info().Msg("generating aes setting")
	directory.ForEachNamespace(func(ctx context.Context) (string, error) {
		err = initializeAES(ctx)
		if err != nil {
			log.Fatal().Msg(err.Error())
		}
		return "initializeAES", err
	})

	err = initializeTelemetry()
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	err = initMinio()
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
					Logger:  log.NewStdLoggerWithLevel(zerolog.DebugLevel),
					NoColor: true,
				},
			),
		)
	}

	internalMux := chi.NewRouter()
	internalMux.Use(middleware.Recoverer)
	if *enableHttpLogs {
		internalMux.Use(
			middleware.RequestLogger(
				&middleware.DefaultLogFormatter{
					Logger:  log.NewStdLoggerWithLevel(zerolog.DebugLevel),
					NoColor: true,
				},
			),
		)
	}

	ingestC := make(chan *kgo.Record, 10000)

	ctx, cancel := context.WithCancel(context.Background())
	go utils.StartKafkaProducer(ctx, strings.Split(kafkaBrokers, ","), ingestC)

	wml := watermill.NewStdLogger(false, false)

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
		*serveOpenapiDocs, ingestC, publisher, openApiDocs, config.Orchestrator,
	)
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}

	err = router.InternalRoutes(internalMux,
		config.InternalListenEndpoint, config.JwtSecret, ingestC, publisher,
	)
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}

	httpServer := http.Server{
		Addr:     config.HttpListenEndpoint,
		Handler:  mux,
		ErrorLog: log.NewStdLoggerWithLevel(zerolog.ErrorLevel),
	}

	internalServer := http.Server{
		Addr:     config.InternalListenEndpoint,
		Handler:  internalMux,
		ErrorLog: log.NewStdLoggerWithLevel(zerolog.ErrorLevel),
	}

	// start the servers

	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		sigint := make(chan os.Signal, 1)
		signal.Notify(sigint, os.Interrupt)
		<-sigint
		if err := httpServer.Shutdown(context.Background()); err != nil {
			log.Error().Msgf("http server shutdown error: %v", err)
		}
		if err := internalServer.Shutdown(context.Background()); err != nil {
			log.Error().Msgf("internal server shutdown error: %v", err)
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		log.Info().Msgf("start http server at %s", config.HttpListenEndpoint)
		if err := httpServer.ListenAndServe(); err != http.ErrServerClosed {
			log.Error().Msgf("http server ListenAndServe error: %v", err)
			return
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		log.Info().Msgf("start internal server at %s", config.InternalListenEndpoint)
		if err := internalServer.ListenAndServe(); err != http.ErrServerClosed {
			log.Error().Msgf("internal server ListenAndServe error: %v", err)
			return
		}
	}()

	wg.Wait()
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

	orchestrator := os.Getenv("DEEPFENCE_CONSOLE_ORCHESTRATOR")
	if orchestrator != consolediagnosis.DockerOrchestrator && orchestrator != consolediagnosis.KubernetesOrchestrator {
		orchestrator = consolediagnosis.DockerOrchestrator
	}

	return &Config{
		HttpListenEndpoint:     ":" + httpListenEndpoint,
		InternalListenEndpoint: ":8081",
		Orchestrator:           orchestrator,
	}, nil
}

func initializeAES(ctx context.Context) error {
	// set aes_secret in setting table, if !exists
	// TODO
	// generate aes and aes-iv
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

func initializeDatabase(ctx context.Context) ([]byte, error) {
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
	err = model.SetScanResultsDeletionSetting(ctx, pgClient)
	if err != nil {
		return nil, err
	}
	err = model.InitializeScheduledTasks(ctx, pgClient)
	if err != nil {
		return nil, err
	}
	return jwtSecret, nil
}

func resetUserPassword(ctx context.Context) error {
	fmt.Println("\nEnter your email id:")
	var emailId string
	fmt.Scanln(&emailId)
	fmt.Println("\nEnter new password: (should contain at least one upper case, lower case, digit and special character)")
	password, err := terminal.ReadPassword(0)
	if err != nil {
		return err
	}
	fmt.Println("\nReenter the new password:")
	password2, err := terminal.ReadPassword(0)
	if err != nil {
		return err
	}
	if string(password) != string(password2) {
		return errors.New("passwords do not match")
	}

	req := model.LoginRequest{Email: emailId, Password: string(password)}
	inputValidator := validator.New()
	err = inputValidator.RegisterValidation("password", model.ValidatePassword)
	if err != nil {
		return err
	}
	err = inputValidator.Struct(req)
	if err != nil {
		return err
	}

	user, statusCode, pgClient, err := model.GetUserByEmail(ctx, emailId)
	if err != nil {
		if statusCode == http.StatusNotFound {
			return errors.New("user not found with provided email id")
		}
		return err
	}
	err = user.SetPassword(string(password))
	if err != nil {
		return err
	}
	err = user.UpdatePassword(ctx, pgClient)
	if err != nil {
		return err
	}
	fmt.Println("Password changed successfully")
	return nil
}

func initializeOpenApiDocs(openApiDocs *apiDocs.OpenApiDocs) {
	openApiDocs.AddUserAuthOperations()
	openApiDocs.AddUserOperations()
	openApiDocs.AddGraphOperations()
	openApiDocs.AddLookupOperations()
	openApiDocs.AddSearchOperations()
	openApiDocs.AddControlsOperations()
	openApiDocs.AddIngestersOperations()
	openApiDocs.AddScansOperations()
	openApiDocs.AddDiagnosisOperations()
	openApiDocs.AddCloudNodeOperations()
	openApiDocs.AddRegistryOperations()
	openApiDocs.AddIntegrationOperations()
	openApiDocs.AddReportsOperations()
	openApiDocs.AddSettingsOperations()
}

func initializeInternalOpenApiDocs(openApiDocs *apiDocs.OpenApiDocs) {
	openApiDocs.AddInternalAuthOperations()
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

func initializeTelemetry() error {
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
			semconv.ServiceNameKey.String("deepfence-server"),
			attribute.String("environment", "dev"),
		)),
	)

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(
		propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}),
	)
	return nil
}

func initMinio() error {
	ctx := directory.NewContextWithNameSpace("database")
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	if err := mc.CreatePublicBucket(ctx); err != nil {
		log.Error().Err(err).Msgf("failed to create bucket")
		return err
	}

	go func() {
		handler.PeriodicDownloadDB()
	}()

	return nil
}
