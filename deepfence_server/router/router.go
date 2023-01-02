package router

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/apiDocs"
	"github.com/deepfence/ThreatMapper/deepfence_server/handler"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/jwtauth/v5"
	"github.com/go-playground/validator/v10"
	"os"
	"strings"
)

func SetupRoutes(r *chi.Mux, serverPort string, serveOpenapiDocs bool) error {
	// JWT
	tokenAuth := getTokenAuth()

	// authorization
	authEnforcer, err := getAuthorizationHandler()
	if err != nil {
		return err
	}

	openApiDocs := apiDocs.InitializeOpenAPIReflector()

	dfHandler := &handler.Handler{
		TokenAuth:      tokenAuth,
		AuthEnforcer:   authEnforcer,
		OpenApiDocs:    openApiDocs,
		SaasDeployment: IsSaasDeployment(),
		Validator:      validator.New(),
	}

	err = dfHandler.Validator.RegisterValidation("password", model.ValidatePassword)
	if err != nil {
		return err
	}
	err = dfHandler.Validator.RegisterValidation("company_name", model.ValidateCompanyName)
	if err != nil {
		return err
	}
	err = dfHandler.Validator.RegisterValidation("user_name", model.ValidateUserName)
	if err != nil {
		return err
	}

	//root := "/usr/local/share/swagger-ui"
	//fs := http.FileServer(http.Dir(root))

	r.Route("/deepfence", func(r chi.Router) {
		r.Get("/ping", dfHandler.Ping)
		r.Get("/async_ping", dfHandler.AsyncPing)

		// public apis
		r.Group(func(r chi.Router) {
			openApiDocs.AddUserAuthOperations()
			r.Post("/user/register", dfHandler.RegisterUser)
			r.Post("/auth/token", dfHandler.ApiAuthHandler)
			r.Post("/user/login", dfHandler.LoginHandler)
			if serveOpenapiDocs {
				log.Info().Msgf("OpenAPI documentation: http://0.0.0.0%s/deepfence/openapi-docs", serverPort)
				r.Get("/openapi-docs", dfHandler.OpenApiDocsHandler)
				//r.Get("/swagger-ui/", func(w http.ResponseWriter, r *http.Request) {
				//	http.StripPrefix("/deepfence/swagger-ui", fs).ServeHTTP(w, r)
				//})
			}
		})

		// authenticated apis
		r.Group(func(r chi.Router) {
			r.Use(jwtauth.Verifier(tokenAuth))
			r.Use(jwtauth.Authenticator)

			r.Post("/user/logout", dfHandler.LogoutHandler)

			openApiDocs.AddUserOperations()
			// current user
			r.Route("/user", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler("user", "read", dfHandler.GetUser))
				r.Put("/", dfHandler.AuthHandler("user", "write", dfHandler.UpdateUser))
				r.Delete("/", dfHandler.AuthHandler("user", "delete", dfHandler.DeleteUser))
			})

			r.Route("/api-token", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler("user", "read", dfHandler.GetApiTokens))
			})

			// manage other users
			r.Route("/users/{userId}", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler("all-users", "read", dfHandler.GetUser))
				r.Put("/", dfHandler.AuthHandler("all-users", "write", dfHandler.UpdateUser))
				r.Delete("/", dfHandler.AuthHandler("all-users", "delete", dfHandler.DeleteUser))
			})

			openApiDocs.AddGraphOperations()
			r.Route("/graph", func(r chi.Router) {
				r.Post("/topology", dfHandler.GetTopologyGraph)
				r.Post("/threat", dfHandler.GetThreatGraph)
			})

			openApiDocs.AddIngestersOperations()
			r.Route("/ingest", func(r chi.Router) {
				r.Post("/report", dfHandler.IngestAgentReport)
				r.Post("/cves", dfHandler.IngestCVEReportHandler)
				r.Post("/secrets", dfHandler.IngestSecretReportHandler)
				r.Post("/malware", dfHandler.IngestMalwareReportHandler)
				r.Post("/compliance", dfHandler.IngestComplianceReportHandler)
				r.Post("/cloud-compliance", dfHandler.IngestCloudComplianceReportHandler)
				r.Post("/cloud-resources", dfHandler.IngestCloudResourcesReportHandler)
			})

			openApiDocs.AddScansOperations()
			r.Route("/scan/start", func(r chi.Router) {
				r.Get("/cves", dfHandler.StartCVEScanHandler)
				r.Get("/secrets", dfHandler.StartSecretScanHandler)
				r.Get("/malware", dfHandler.StartMalwareScanHandler)
				r.Get("/compliances", dfHandler.StartComplianceScanHandler)
			})

		})
	})
	return nil
}

func getTokenAuth() *jwtauth.JWTAuth {
	return jwtauth.New("HS256", []byte(utils.NewUUIDString()), nil)
}

func getAuthorizationHandler() (*casbin.Enforcer, error) {
	return casbin.NewEnforcer("auth/model.conf", "auth/policy.csv")
}

func IsSaasDeployment() bool {
	if strings.ToLower(os.Getenv("SAAS_DEPLOYMENT")) == "true" {
		return true
	}
	return false
}
