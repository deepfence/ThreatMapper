package router

import (
	"net/http"
	"os"
	"strings"

	"github.com/casbin/casbin/v2"
	"github.com/deepfence/ThreatMapper/deepfence_server/apiDocs"
	"github.com/deepfence/ThreatMapper/deepfence_server/handler"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/jwtauth/v5"
	"github.com/go-playground/validator/v10"
	"github.com/twmb/franz-go/pkg/kgo"
)

const (
	// API RBAC permissions

	PermissionRead   = "read"
	PermissionWrite  = "write"
	PermissionDelete = "delete"
	PermissionIngest = "ingest"
	PermissionStart  = "start"
	PermissionStop   = "stop"

	//	API RBAC Resources

	ResourceUser        = "user"
	ResourceAllUsers    = "all-users"
	ResourceAgentReport = "agent-report"
	ResourceCloudReport = "cloud-report"
	ResourceScanReport  = "scan-report"
	ResourceScan        = "scan"
)

func SetupRoutes(r *chi.Mux, serverPort string, jwtSecret []byte, serveOpenapiDocs bool, ingestC chan *kgo.Record) (*handler.Handler, error) {
	// JWT
	tokenAuth := jwtauth.New("HS256", jwtSecret, nil)

	// authorization
	authEnforcer, err := newAuthorizationHandler()
	if err != nil {
		return nil, err
	}

	openApiDocs := apiDocs.InitializeOpenAPIReflector()

	dfHandler := &handler.Handler{
		TokenAuth:      tokenAuth,
		AuthEnforcer:   authEnforcer,
		OpenApiDocs:    openApiDocs,
		SaasDeployment: IsSaasDeployment(),
		Validator:      validator.New(),
		IngestChan:     ingestC,
	}

	err = dfHandler.Validator.RegisterValidation("password", model.ValidatePassword)
	if err != nil {
		return nil, err
	}
	err = dfHandler.Validator.RegisterValidation("company_name", model.ValidateCompanyName)
	if err != nil {
		return nil, err
	}
	err = dfHandler.Validator.RegisterValidation("user_name", model.ValidateUserName)
	if err != nil {
		return nil, err
	}

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
				log.Info().Msgf("OpenAPI documentation: http://0.0.0.0%s/deepfence/openapi.json", serverPort)
				log.Info().Msgf("Swagger UI : http://0.0.0.0%s/deepfence/swagger-ui/", serverPort)
				r.Get("/openapi.json", dfHandler.OpenApiDocsHandler)
				r.Handle("/swagger-ui/*",
					http.StripPrefix("/deepfence/swagger-ui",
						http.FileServer(http.Dir("/usr/local/share/swagger-ui/"))))
			}
		})

		// authenticated apis
		r.Group(func(r chi.Router) {
			r.Use(jwtauth.Verifier(tokenAuth))
			r.Use(directory.Injector)

			r.Post("/user/logout", dfHandler.LogoutHandler)

			openApiDocs.AddUserOperations()
			// current user
			r.Route("/user", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler(ResourceUser, PermissionRead, dfHandler.GetUser))
				r.Put("/", dfHandler.AuthHandler(ResourceUser, PermissionWrite, dfHandler.UpdateUser))
				r.Delete("/", dfHandler.AuthHandler(ResourceUser, PermissionDelete, dfHandler.DeleteUser))
			})

			r.Route("/api-token", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler(ResourceUser, PermissionRead, dfHandler.GetApiTokens))
			})

			// Generate new access token using refresh token
			r.Post("/auth/token/refresh", dfHandler.RefreshTokenHandler)

			// manage other users
			r.Route("/users/{userId}", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler(ResourceAllUsers, PermissionRead, dfHandler.GetUser))
				r.Put("/", dfHandler.AuthHandler(ResourceAllUsers, PermissionWrite, dfHandler.UpdateUser))
				r.Delete("/", dfHandler.AuthHandler(ResourceAllUsers, PermissionDelete, dfHandler.DeleteUser))
			})

			openApiDocs.AddGraphOperations()
			r.Route("/graph", func(r chi.Router) {
				r.Post("/topology", dfHandler.GetTopologyGraph)
				r.Post("/threat", dfHandler.GetThreatGraph)
			})

			openApiDocs.AddIngestersOperations()
			r.Route("/ingest", func(r chi.Router) {
				r.Post("/report", dfHandler.AuthHandler(ResourceAgentReport, PermissionIngest, dfHandler.IngestAgentReport))
				r.Post("/cloud-resources", dfHandler.AuthHandler(ResourceCloudReport, PermissionIngest, dfHandler.IngestCloudResourcesReportHandler))
				// below api's write to kafka
				r.Post("/vulnerabilities", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestVulnerabilityReportHandler))
				r.Post("/secrets", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestSecretReportHandler))
				r.Post("/secret-scan-logs", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestSecretScanStatusHandler))
				r.Post("/compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestComplianceReportHandler))
				r.Post("/cloud-compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestCloudComplianceReportHandler))
			})

			openApiDocs.AddScansOperations()
			r.Route("/scan/start", func(r chi.Router) {
				r.Post("/vulnerability", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.StartVulnerabilityScanHandler))
				r.Post("/secret", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.StartSecretScanHandler))
				r.Post("/compliance", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.StartComplianceScanHandler))
				r.Post("/malware", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.StartMalwareScanHandler))
			})
			r.Route("/scan/stop", func(r chi.Router) {
				r.Post("/vulnerability", dfHandler.AuthHandler(ResourceScan, PermissionStop, dfHandler.StopVulnerabilityScanHandler))
				r.Post("/secret", dfHandler.AuthHandler(ResourceScan, PermissionStop, dfHandler.StopSecretScanHandler))
				r.Post("/compliance", dfHandler.AuthHandler(ResourceScan, PermissionStop, dfHandler.StopComplianceScanHandler))
				r.Post("/malware", dfHandler.AuthHandler(ResourceScan, PermissionStop, dfHandler.StopMalwareScanHandler))
			})
			r.Route("/scan/status", func(r chi.Router) {
				r.Post("/vulnerability", dfHandler.AuthHandler(ResourceScan, PermissionStop, dfHandler.StatusVulnerabilityScanHandler))
				r.Post("/secret", dfHandler.AuthHandler(ResourceScan, PermissionStop, dfHandler.StatusSecretScanHandler))
				r.Post("/compliance", dfHandler.AuthHandler(ResourceScan, PermissionStop, dfHandler.StatusComplianceScanHandler))
				r.Post("/malware", dfHandler.AuthHandler(ResourceScan, PermissionStop, dfHandler.StatusMalwareScanHandler))
			})

		})
	})
	return dfHandler, nil
}

func newAuthorizationHandler() (*casbin.Enforcer, error) {
	return casbin.NewEnforcer("auth/model.conf", "auth/policy.csv")
}

func IsSaasDeployment() bool {
	return strings.ToLower(os.Getenv("DEEPFENCE_SAAS_DEPLOYMENT")) == "true"
}
