package main

import (
	"context"
	"github.com/casbin/casbin/v2"
	"github.com/deepfence/ThreatMapper/deepfence_server/common"
	"github.com/deepfence/ThreatMapper/deepfence_server/router"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/jwtauth/v5"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"github.com/swaggest/openapi-go/openapi3"
	"net/http"
	"os"
	"os/signal"
)

func main() {
	customFormatter := new(logrus.TextFormatter)
	customFormatter.TimestampFormat = "2006-01-02 15:04:05"
	logrus.SetFormatter(customFormatter)
	customFormatter.FullTimestamp = true

	err := initialize()
	if err != nil {
		logrus.Error(err.Error())
		return
	}

	logrus.Info("starting deepfence-server")

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	router.SetupRoutes(r)

	httpServer := http.Server{Addr: ":8080", Handler: r}

	idleConnectionsClosed := make(chan struct{})
	go func() {
		sigint := make(chan os.Signal, 1)
		signal.Notify(sigint, os.Interrupt)
		<-sigint
		if err := httpServer.Shutdown(context.Background()); err != nil {
			logrus.Errorf("http server shutdown error: %v", err)
		}
		close(idleConnectionsClosed)
	}()

	if err := httpServer.ListenAndServe(); err != http.ErrServerClosed {
		logrus.Errorf("http server ListenAndServe error: %v", err)
	}

	<-idleConnectionsClosed

	logrus.Info("deepfence-server stopped")
}

func initialize() error {
	// JWT
	common.TokenAuth = jwtauth.New("HS256", uuid.New(), nil)

	var err error
	// authorization
	common.CasbinEnforcer, err = casbin.NewEnforcer("authorization/casbin_model.conf", "authorization/casbin_policy.csv")
	if err != nil {
		return err
	}

	// OpenAPI generation
	description := "Deepfence ThreatMapper API Documentation"
	common.OpenAPI = &openapi3.Reflector{
		Spec: &openapi3.Spec{
			Openapi: "3.0.3",
			Info: openapi3.Info{
				Title:          "Deepfence ThreatMapper",
				Description:    &description,
				TermsOfService: nil,
				Contact:        nil,
				License:        nil,
				Version:        "2.0.0",
			},
			ExternalDocs:  nil,
			Servers:       nil,
			Security:      nil,
			Tags:          nil,
			Paths:         openapi3.Paths{},
			Components:    nil,
			MapOfAnything: nil,
		},
	}
	//schema, err := common.OpenAPI.Spec.MarshalYAML()
	return nil
}
