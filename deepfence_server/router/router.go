package router

import (
	"net/http"
	"os"
	"strings"

	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/casbin/casbin/v2"
	"github.com/deepfence/ThreatMapper/deepfence_server/apiDocs"
	"github.com/deepfence/ThreatMapper/deepfence_server/handler"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/jwtauth/v5"
	"github.com/go-playground/validator/v10"
	"github.com/twmb/franz-go/pkg/kgo"
)

const (
	// API RBAC permissions

	PermissionRead     = "read"
	PermissionWrite    = "write"
	PermissionDelete   = "delete"
	PermissionIngest   = "ingest"
	PermissionStart    = "start"
	PermissionStop     = "stop"
	PermissionGenerate = "generate"
	PermissionRegister = "register"

	//	API RBAC Resources

	ResourceUser        = "user"
	ResourceAllUsers    = "all-users"
	ResourceAgentReport = "agent-report"
	ResourceCloudReport = "cloud-report"
	ResourceScanReport  = "scan-report"
	ResourceScan        = "scan"
	ResourceDiagnosis   = "diagnosis"
	ResourceCloudNode   = "cloud-node"
	ResourceRegistry    = "container-registry"
)

func SetupRoutes(r *chi.Mux, serverPort string, jwtSecret []byte, serveOpenapiDocs bool,
	ingestC chan *kgo.Record, taskPublisher *kafka.Publisher, openApiDocs *apiDocs.OpenApiDocs) error {
	// JWT
	tokenAuth := jwtauth.New("HS256", jwtSecret, nil)

	// authorization
	authEnforcer, err := newAuthorizationHandler()
	if err != nil {
		return err
	}

	dfHandler := &handler.Handler{
		TokenAuth:      tokenAuth,
		AuthEnforcer:   authEnforcer,
		OpenApiDocs:    openApiDocs,
		SaasDeployment: IsSaasDeployment(),
		Validator:      validator.New(),
		IngestChan:     ingestC,
		TasksPublisher: taskPublisher,
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

	r.Route("/deepfence", func(r chi.Router) {
		r.Get("/ping", dfHandler.Ping)

		// public apis
		r.Group(func(r chi.Router) {
			r.Post("/user/register", dfHandler.RegisterUser)
			r.Post("/user/invite/register", dfHandler.RegisterInvitedUser)
			r.Post("/auth/token", dfHandler.ApiAuthHandler)
			r.Post("/user/login", dfHandler.LoginHandler)

			r.Post("/user/reset-password/request", dfHandler.ResetPasswordRequest)
			r.Post("/user/reset-password/verify", dfHandler.ResetPasswordVerification)

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

			// current user
			r.Route("/user", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler(ResourceUser, PermissionRead, dfHandler.GetUser))
				r.Put("/", dfHandler.AuthHandler(ResourceUser, PermissionWrite, dfHandler.UpdateUser))
				r.Delete("/", dfHandler.AuthHandler(ResourceUser, PermissionDelete, dfHandler.DeleteUser))
			})

			r.Route("/api-token", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler(ResourceUser, PermissionRead, dfHandler.GetApiTokens))
				r.Post("/reset", dfHandler.AuthHandler(ResourceUser, PermissionRead, dfHandler.ResetApiToken))
			})

			// Generate new access token using refresh token
			r.Post("/auth/token/refresh", dfHandler.RefreshTokenHandler)

			// manage other users
			r.Post("/user/invite", dfHandler.AuthHandler(ResourceAllUsers, PermissionWrite, dfHandler.InviteUser))
			r.Route("/users", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler(ResourceAllUsers, PermissionRead, dfHandler.GetUsers))
			})
			r.Route("/users/{userId}", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler(ResourceAllUsers, PermissionRead, dfHandler.GetUser))
				r.Put("/", dfHandler.AuthHandler(ResourceAllUsers, PermissionWrite, dfHandler.UpdateUser))
				r.Delete("/", dfHandler.AuthHandler(ResourceAllUsers, PermissionDelete, dfHandler.DeleteUser))
			})

			r.Route("/graph", func(r chi.Router) {
				r.Route("/topology", func(r chi.Router) {
					r.Post("/", dfHandler.GetTopologyGraph)
					r.Post("/hosts", dfHandler.GetTopologyHostsGraph)
					r.Post("/kubernetes", dfHandler.GetTopologyKubernetesGraph)
					r.Post("/containers", dfHandler.GetTopologyContainersGraph)
					r.Post("/pods", dfHandler.GetTopologyPodsGraph)
				})
				r.Post("/threat", dfHandler.GetThreatGraph)
			})

			r.Route("/lookup", func(r chi.Router) {
				r.Post("/hosts", dfHandler.GetHosts)
				r.Post("/containers", dfHandler.GetContainers)
				r.Post("/processes", dfHandler.GetProcesses)
				r.Post("/kubernetesclusters", dfHandler.GetKubernetesClusters)
				r.Post("/containerimages", dfHandler.GetContainerImages)
				r.Post("/pods", dfHandler.GetPods)
				r.Post("/registryaccount", dfHandler.GetRegistryAccount)
			})

			r.Route("/search", func(r chi.Router) {
				r.Post("/hosts", dfHandler.SearchHosts)
				r.Post("/containers", dfHandler.SearchContainers)
				r.Post("/images", dfHandler.SearchContainerImages)
				r.Post("/vulnerabilities", dfHandler.SearchVulnerabilities)
				r.Post("/secrets", dfHandler.SearchSecrets)
				r.Post("/malwares", dfHandler.SearchMalwares)
				r.Post("/cloud-compliances", dfHandler.SearchCloudCompliances)
				r.Post("/compliances", dfHandler.SearchCompliances)

				r.Post("/vulnerability/scans", dfHandler.SearchVulnerabilityScans)
				r.Post("/secret/scans", dfHandler.SearchSecretScans)
				r.Post("/malware/scans", dfHandler.SearchMalwareScans)
				r.Post("/compliance/scans", dfHandler.SearchComplianceScans)
				r.Post("/cloud-compliance/scans", dfHandler.SearchCloudComplianceScans)
			})

			r.Route("/controls", func(r chi.Router) {
				r.Post("/agent", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.GetAgentControls))
				r.Post("/kubernetes-cluster", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.GetKubernetesClusterControls))
				r.Post("/agent-init", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.GetAgentInitControls))
				r.Post("/agent-upgrade", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.ScheduleAgentUpgrade))
			})

			r.Route("/ingest", func(r chi.Router) {
				r.Post("/report", dfHandler.AuthHandler(ResourceAgentReport, PermissionIngest, dfHandler.IngestAgentReport))
				r.Post("/sync-report", dfHandler.AuthHandler(ResourceAgentReport, PermissionIngest, dfHandler.IngestSyncAgentReport))
				r.Post("/cloud-resources", dfHandler.AuthHandler(ResourceCloudReport, PermissionIngest, dfHandler.IngestCloudResourcesReportHandler))
				// below api's write to kafka
				r.Post("/sbom", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestSbomHandler))
				r.Post("/vulnerabilities", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestVulnerabilityReportHandler))
				r.Post("/vulnerabilities-scan-logs", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestVulnerabilityScanStatusHandler))
				r.Post("/secrets", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestSecretReportHandler))
				r.Post("/secret-scan-logs", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestSecretScanStatusHandler))
				r.Post("/compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestComplianceReportHandler))
				r.Post("/malware", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestMalwareReportHandler))
				r.Post("/malware-scan-logs", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestMalwareScanStatusHandler))
				r.Post("/cloud-compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestCloudComplianceReportHandler))
				r.Post("/cloud-compliance-status", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestCloudComplianceScanStatusReportHandler))
			})

			r.Route("/cloud-node", func(r chi.Router) {
				r.Post("/account", dfHandler.AuthHandler(ResourceCloudNode, PermissionRegister, dfHandler.RegisterCloudNodeAccountHandler))
				r.Post("/list/accounts", dfHandler.AuthHandler(ResourceCloudNode, PermissionRead, dfHandler.ListCloudNodeAccountHandler))
				r.Get("/list/providers", dfHandler.AuthHandler(ResourceCloudNode, PermissionRead, dfHandler.ListCloudNodeProvidersHandler))
			})

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
				r.Get("/vulnerability", dfHandler.AuthHandler(ResourceScan, PermissionRead, dfHandler.StatusVulnerabilityScanHandler))
				r.Get("/secret", dfHandler.AuthHandler(ResourceScan, PermissionRead, dfHandler.StatusSecretScanHandler))
				r.Get("/compliance", dfHandler.AuthHandler(ResourceScan, PermissionRead, dfHandler.StatusComplianceScanHandler))
				r.Get("/malware", dfHandler.AuthHandler(ResourceScan, PermissionRead, dfHandler.StatusMalwareScanHandler))
				r.Get("/cloud-compliance", dfHandler.AuthHandler(ResourceScan, PermissionRead, dfHandler.StatusCloudComplianceScanHandler))
			})
			r.Route("/scan/list", func(r chi.Router) {
				r.Post("/vulnerability", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListVulnerabilityScansHandler))
				r.Post("/secret", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListSecretScansHandler))
				r.Post("/compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListComplianceScansHandler))
				r.Post("/malware", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListMalwareScansHandler))
			})
			r.Route("/scan/results", func(r chi.Router) {
				r.Post("/vulnerability", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListVulnerabilityScanResultsHandler))
				r.Post("/secret", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListSecretScanResultsHandler))
				r.Post("/compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListComplianceScanResultsHandler))
				r.Post("/malware", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListMalwareScanResultsHandler))
				r.Post("/cloud-compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListCloudComplianceScanResultsHandler))
			})

			r.Route("/registryaccount", func(r chi.Router) {
				r.Get("/list", dfHandler.AuthHandler(ResourceRegistry, PermissionRead, dfHandler.ListRegistry))
				r.Post("/", dfHandler.AuthHandler(ResourceRegistry, PermissionWrite, dfHandler.AddRegistry))
				r.Route("/{registryId}", func(r chi.Router) {
					// r.Use(directory.RegistryCtx)
					r.Delete("/", dfHandler.AuthHandler(ResourceRegistry, PermissionDelete, dfHandler.DeleteRegistry))
				})
			})

			r.Route("/diagnosis", func(r chi.Router) {
				r.Get("/notification", dfHandler.AuthHandler(ResourceDiagnosis, PermissionRead, dfHandler.DiagnosticNotification))
				r.Post("/console-logs", dfHandler.AuthHandler(ResourceDiagnosis, PermissionGenerate, dfHandler.GenerateConsoleDiagnosticLogs))
				r.Post("/agent-logs", dfHandler.AuthHandler(ResourceDiagnosis, PermissionGenerate, dfHandler.GenerateAgentDiagnosticLogs))
				r.Get("/diagnostic-logs", dfHandler.AuthHandler(ResourceDiagnosis, PermissionRead, dfHandler.GetDiagnosticLogs))
			})
		})
	})
	return nil
}

func newAuthorizationHandler() (*casbin.Enforcer, error) {
	return casbin.NewEnforcer("auth/model.conf", "auth/policy.csv")
}

func IsSaasDeployment() bool {
	return strings.ToLower(os.Getenv("DEEPFENCE_SAAS_DEPLOYMENT")) == "true"
}
