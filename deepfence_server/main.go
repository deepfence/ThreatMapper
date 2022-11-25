package main

import (
	"context"
	"flag"
	"net/http"
	"os"
	"os/signal"

	"github.com/deepfence/ThreatMapper/deepfence_server/router"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

var (
	verbosity = flag.String("verbose", "info", "log level")
)

type Config struct {
	RedisEndpoint      string
	HttpListenEndpoint string
}

func main() {
	flag.Parse()

	config, err := initialize()
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}

	log.Info().Msg("starting deepfence-server")

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	err = router.SetupRoutes(r)
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

	log.Info().Msg("deepfence-server stopped")
}

func initialize() (Config, error) {
	// logger
	// Default log level
	switch *verbosity {
	case zerolog.LevelTraceValue:
		zerolog.SetGlobalLevel(zerolog.TraceLevel)
	case zerolog.LevelDebugValue:
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case zerolog.LevelInfoValue:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case zerolog.LevelWarnValue:
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case zerolog.LevelErrorValue:
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	case zerolog.LevelFatalValue:
		zerolog.SetGlobalLevel(zerolog.FatalLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	//redisEndpoint, has := os.LookupEnv("REDIS_ENDPOINT")
	//if !has {
	//	return Config{}, errors.New("REDIS_ENDPOINT undefined")
	//}

	httpListenEndpoint := os.Getenv("HTTP_LISTEN_ENDPOINT")
	if httpListenEndpoint == "" {
		httpListenEndpoint = "8080"
	}

	//schema, err := common.OpenAPI.Spec.MarshalYAML()
	return Config{
		RedisEndpoint:      "",
		HttpListenEndpoint: ":" + httpListenEndpoint,
	}, nil
}
