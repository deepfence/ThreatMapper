package router

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/handler"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/twmb/franz-go/pkg/kgo"
)

func InternalRoutes(r *chi.Mux, ingestC chan *kgo.Record, debug bool) error {
	// authorization
	authEnforcer, err := newAuthorizationHandler()
	if err != nil {
		return err
	}

	dfHandler := &handler.Handler{
		AuthEnforcer:   authEnforcer,
		SaasDeployment: IsSaasDeployment(),
		Validator:      validator.New(),
		IngestChan:     ingestC,
	}

	r.Route("/deepfence", func(r chi.Router) {
		r.Route("/internal", func(r chi.Router) {
			r.Route("/console-api-token", func(r chi.Router) {
				r.Get("/", dfHandler.GetAPITokenForConsoleAgent)
			})
		})
	})

	// profiler, enabled in debug mode
	if debug {
		r.Mount("/debug", middleware.Profiler())
	}
	// metrics
	r.Handle("/metrics", promhttp.HandlerFor(NewMetrics(), promhttp.HandlerOpts{EnableOpenMetrics: true}))

	return nil
}
