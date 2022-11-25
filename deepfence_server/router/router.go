package router

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/authorization"
	"github.com/deepfence/ThreatMapper/deepfence_server/common"
	"github.com/deepfence/ThreatMapper/deepfence_server/handler"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/jwtauth/v5"
)

func SetupRoutes(r *chi.Mux) {
	r.Route("/deepfence", func(r chi.Router) {
		// public apis
		r.Group(func(r chi.Router) {
			r.Post("/login", handler.LoginHandler)
		})

		// authenticated apis
		r.Group(func(r chi.Router) {
			r.Use(jwtauth.Verifier(common.TokenAuth))
			r.Use(jwtauth.Authenticator)

			// current user
			r.Route("/user", func(r chi.Router) {
				r.Get("/", authorization.CasbinHandler("user", "read", handler.GetUser))
				r.Put("/", authorization.CasbinHandler("user", "write", handler.UpdateUser))
				r.Delete("/", authorization.CasbinHandler("user", "delete", handler.DeleteUser))
			})

			// manage other users
			r.Route("/users/{userId}", func(r chi.Router) {
				r.Get("/", authorization.CasbinHandler("all-users", "read", handler.GetUser))
				r.Put("/", authorization.CasbinHandler("all-users", "write", handler.UpdateUser))
				r.Delete("/", authorization.CasbinHandler("all-users", "delete", handler.DeleteUser))
			})
		})
	})
}
