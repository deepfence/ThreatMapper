package main

import (
	"context"
	"flag"
	"net/http"
	"os"
	"os/signal"

	"github.com/deepfence/ThreatMapper/deepfence_server/router"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

var (
	verbosity   = flag.String("verbose", "info", "log level")
	openapiDocs = flag.Bool("api-docs", false, "serve openapi documentation")
)

type Config struct {
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

	err = router.SetupRoutes(r, config.HttpListenEndpoint, *openapiDocs)
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
	log.Initialize(*verbosity)

	httpListenEndpoint := os.Getenv("HTTP_LISTEN_ENDPOINT")
	if httpListenEndpoint == "" {
		httpListenEndpoint = "8080"
	}

	return Config{
		HttpListenEndpoint: ":" + httpListenEndpoint,
	}, nil
}
