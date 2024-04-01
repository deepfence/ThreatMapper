package main

import (
	"context"
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

	"github.com/deepfence/ThreatMapper/deepfence_server/apiDocs"
	consolediagnosis "github.com/deepfence/ThreatMapper/deepfence_server/diagnosis/console-diagnosis"
	"github.com/deepfence/ThreatMapper/deepfence_server/handler"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_server/router"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
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
	"go.opentelemetry.io/otel/trace/noop"
	terminal "golang.org/x/term"
)

var (
	verbosity             = flag.String("verbose", "info", "log level")
	resetPassword         = flag.Bool("reset-password", false, "reset password for a user")
	exportOpenapiDocsPath = flag.String("export-api-docs-path", "", "export openapi documentation to file path")
	serveOpenapiDocs      = flag.Bool("api-docs", true, "serve openapi documentation")
	enableHTTPLogs        = flag.Bool("http-logs", false, "enable request logs")
	kafkaBrokers          string
	enableDebug           bool
)

type Config struct {
	HTTPListenEndpoint     string
	InternalListenEndpoint string
	Orchestrator           string
}

func init() {
	debug := "debug"
	enableDebug = os.Getenv("DF_ENABLE_DEBUG") != ""
	if enableDebug {
		verbosity = &debug
	}
}

func main() {

	log.Info().Msgf("\n version: %s\n commit: %s\n build-time: %s\n",
		constants.Version, constants.Commit, constants.BuildTime)

	if enableDebug {
		runtime.SetBlockProfileRate(1)
		runtime.SetMutexProfileFraction(1)
	}

	flag.Parse()

	openAPIDocs := apiDocs.InitializeOpenAPIReflector()
	initializeOpenAPIDocs(openAPIDocs)
	initializeInternalOpenAPIDocs(openAPIDocs)

	if *exportOpenapiDocsPath != "" {
		if *exportOpenapiDocsPath != filepath.Clean(*exportOpenapiDocsPath) {
			log.Fatal().Msgf("File path %s is not valid", *exportOpenapiDocsPath)
		}
		openAPIYaml, err := openAPIDocs.Yaml()
		if err != nil {
			log.Fatal().Msg(err.Error())
		}
		err = os.WriteFile(*exportOpenapiDocsPath, openAPIYaml, 0666)
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

	if *resetPassword {
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

	err = initializeTelemetry()
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	log.Info().Msg("starting deepfence-server")

	mux := chi.NewRouter()
	mux.Use(middleware.Recoverer)
	if *enableHTTPLogs {
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
	if *enableHTTPLogs {
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

	err = router.SetupRoutes(mux,
		config.HTTPListenEndpoint, *serveOpenapiDocs, ingestC, openAPIDocs, config.Orchestrator,
	)
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}

	err = router.InternalRoutes(internalMux, ingestC, enableDebug)
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}

	httpServer := http.Server{
		Addr:     config.HTTPListenEndpoint,
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
		log.Info().Msgf("start http server at %s", config.HTTPListenEndpoint)
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
	_ = log.Initialize(*verbosity)

	httpListenEndpoint := os.Getenv("DEEPFENCE_HTTP_LISTEN_ENDPOINT")
	if httpListenEndpoint == "" {
		httpListenEndpoint = "8080"
	}

	orchestrator := os.Getenv("DEEPFENCE_CONSOLE_ORCHESTRATOR")
	if orchestrator != consolediagnosis.DockerOrchestrator && orchestrator != consolediagnosis.KubernetesOrchestrator {
		orchestrator = consolediagnosis.DockerOrchestrator
	}

	return &Config{
		HTTPListenEndpoint:     ":" + httpListenEndpoint,
		InternalListenEndpoint: ":8081",
		Orchestrator:           orchestrator,
	}, nil
}

func resetUserPassword(ctx context.Context) error {
	fmt.Println("\nEnter your email id:")
	var emailID string
	fmt.Scanln(&emailID)
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

	req := model.LoginRequest{Email: emailID, Password: string(password)}
	inputValidator, translator, err := handler.NewValidator()
	if err != nil {
		return err
	}
	err = inputValidator.RegisterValidation("password", handler.ValidatePassword)
	if err != nil {
		return err
	}
	err = inputValidator.Struct(req)
	if err != nil {
		var errs validator.ValidationErrors
		errors.As(err, &errs)
		for _, e := range errs {
			log.Error().Msg(e.Translate(translator))
		}
		return nil
	}

	user, statusCode, pgClient, err := model.GetUserByEmail(ctx, emailID)
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

func initializeOpenAPIDocs(openAPIDocs *apiDocs.OpenAPIDocs) {
	openAPIDocs.AddUserAuthOperations()
	openAPIDocs.AddUserOperations()
	openAPIDocs.AddGraphOperations()
	openAPIDocs.AddLookupOperations()
	openAPIDocs.AddSearchOperations()
	openAPIDocs.AddControlsOperations()
	openAPIDocs.AddIngestersOperations()
	openAPIDocs.AddScansOperations()
	openAPIDocs.AddDiagnosisOperations()
	openAPIDocs.AddCloudNodeOperations()
	openAPIDocs.AddRegistryOperations()
	openAPIDocs.AddIntegrationOperations()
	openAPIDocs.AddReportsOperations()
	openAPIDocs.AddSettingsOperations()
	openAPIDocs.AddDiffAddOperations()
	openAPIDocs.AddCompletionOperations()
	openAPIDocs.AddLicenseOperations()
}

func initializeInternalOpenAPIDocs(openAPIDocs *apiDocs.OpenAPIDocs) {
	openAPIDocs.AddInternalAuthOperations()
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
				semconv.ServiceNameKey.String("deepfence-server"),
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
