package router

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/casbin/casbin/v2"
	"github.com/deepfence/ThreatMapper/deepfence_server/apiDocs"
	consolediagnosis "github.com/deepfence/ThreatMapper/deepfence_server/diagnosis/console-diagnosis"
	"github.com/deepfence/ThreatMapper/deepfence_server/handler"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/jwtauth/v5"
	"github.com/redis/go-redis/v9"
	"github.com/riandyrn/otelchi"
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
	PermissionUpdate   = "update"

	//	API RBAC Resources

	ResourceUser        = "user"
	ResourceSettings    = "settings"
	ResourceAllUsers    = "all-users"
	ResourceAgentReport = "agent-report"
	ResourceCloudReport = "cloud-report"
	ResourceScanReport  = "scan-report"
	ResourceScan        = "scan"
	ResourceDiagnosis   = "diagnosis"
	ResourceCloudNode   = "cloud-node"
	ResourceRegistry    = "container-registry"
	ResourceIntegration = "integration"
	ResourceReport      = "report"
)

// func telemetryInjector(next http.Handler) http.Handler {
// 	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 		_, span := otel.Tracer("router").Start(r.Context(), r.URL.Path)
// 		defer span.End()
// 		lrw := negroni.NewResponseWriter(w)
// 		next.ServeHTTP(w, r)
// 		span.SetAttributes(attribute.Int("status_code", lrw.Status()))
// 	})
// }

var (
	enable_debug bool

	JwtSignKeyNotFoundError = errors.New("jwt sign key not found")
)

func init() {
	enable_debug_str := os.Getenv("DF_ENABLE_DEBUG")
	enable_debug = enable_debug_str != ""
}

func getJWTAuthSignKey() (string, error) {
	signKey := fmt.Sprintf("%v", utils.NewUUIDString())
	if directory.IsNonSaaSDeployment() {
		ctx := directory.NewContextWithNameSpace(directory.NonSaaSDirKey)
		redisClient, err := directory.RedisClient(ctx)
		if err != nil {
			return "", err
		}
		err = redisClient.SetArgs(ctx, constants.REDIS_JWT_SIGN_KEY, signKey, redis.SetArgs{Mode: "NX"}).Err()
		if err == redis.Nil {
			// Key already exists, nothing to do
		} else if err != nil {
			return "", err
		}
		val, err := redisClient.Get(ctx, constants.REDIS_JWT_SIGN_KEY).Result()
		if err == redis.Nil {
			return "", JwtSignKeyNotFoundError
		} else if err != nil {
			return "", err
		}
		return val, nil
	} else {
		return signKey, nil
	}
}

func SetupRoutes(r *chi.Mux, serverPort string, serveOpenapiDocs bool, ingestC chan *kgo.Record, openApiDocs *apiDocs.OpenApiDocs, orchestrator string) error {

	var tokenAuth *jwtauth.JWTAuth

	signKey, err := getJWTAuthSignKey()
	if err != nil {
		return err
	}
	tokenAuth = jwtauth.New("HS256", []byte(signKey), nil)

	// authorization
	authEnforcer, err := newAuthorizationHandler()
	if err != nil {
		return err
	}

	consoleDiagnosis, err := consolediagnosis.NewConsoleDiagnosisHandler(orchestrator)
	if err != nil {
		return err
	}

	apiValidator, translator, err := handler.NewValidator()
	if err != nil {
		return err
	}

	dfHandler := &handler.Handler{
		TokenAuth:        tokenAuth,
		AuthEnforcer:     authEnforcer,
		OpenApiDocs:      openApiDocs,
		SaasDeployment:   IsSaasDeployment(),
		Validator:        apiValidator,
		Translator:       translator,
		IngestChan:       ingestC,
		ConsoleDiagnosis: consoleDiagnosis,
	}

	r.Use(otelchi.Middleware("deepfence-server", otelchi.WithChiRoutes(r)))

	r.Use(middleware.Compress(5))

	if enable_debug {
		r.Mount("/debug", middleware.Profiler())
	}

	r.Route("/deepfence", func(r chi.Router) {
		// r.Use(telemetryInjector)
		r.Get("/ping", dfHandler.Ping)

		// public apis
		r.Group(func(r chi.Router) {
			r.Post("/user/register", dfHandler.RegisterUser)
			r.Post("/user/invite/register", dfHandler.RegisterInvitedUser)
			r.Post("/user/login", dfHandler.LoginHandler)

			r.Post("/user/reset-password/request", dfHandler.ResetPasswordRequest)
			r.Post("/user/reset-password/verify", dfHandler.ResetPasswordVerification)

			// Get access token for api key
			r.Post("/auth/token", dfHandler.ApiAuthHandler)

			r.Get("/end-user-license-agreement", dfHandler.EULAHandler)

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

			// current user
			r.Route("/user", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler(ResourceUser, PermissionRead, dfHandler.GetUser))
				r.Put("/", dfHandler.AuthHandler(ResourceUser, PermissionWrite, dfHandler.UpdateUser))
				r.Put("/password", dfHandler.AuthHandler(ResourceUser, PermissionRead, dfHandler.UpdateUserPassword))
				r.Delete("/", dfHandler.AuthHandler(ResourceUser, PermissionDelete, dfHandler.DeleteUser))
				r.Post("/logout", dfHandler.LogoutHandler)
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
			r.Route("/users/{id}", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler(ResourceAllUsers, PermissionRead, dfHandler.GetUserByUserID))
				r.Put("/", dfHandler.AuthHandler(ResourceAllUsers, PermissionWrite, dfHandler.UpdateUserByUserID))
				r.Delete("/", dfHandler.AuthHandler(ResourceAllUsers, PermissionDelete, dfHandler.DeleteUserByUserID))
			})

			r.Route("/settings", func(r chi.Router) {
				r.Get("/user-activity-log", dfHandler.AuthHandler(ResourceSettings, PermissionRead, dfHandler.GetAuditLogs))
				r.Route("/global-settings", func(r chi.Router) {
					r.Get("/", dfHandler.AuthHandler(ResourceSettings, PermissionRead, dfHandler.GetGlobalSettings))
					r.Patch("/{id}", dfHandler.AuthHandler(ResourceSettings, PermissionWrite, dfHandler.UpdateGlobalSettings))
				})
				r.Post("/email", dfHandler.AuthHandler(ResourceSettings, PermissionWrite, dfHandler.AddEmailConfiguration))
				r.Get("/email", dfHandler.AuthHandler(ResourceSettings, PermissionRead, dfHandler.GetEmailConfiguration))
				r.Delete("/email/{config_id}", dfHandler.AuthHandler(ResourceSettings, PermissionDelete, dfHandler.DeleteEmailConfiguration))
			})

			r.Route("/graph", func(r chi.Router) {
				r.Route("/topology", func(r chi.Router) {
					r.Post("/", dfHandler.GetTopologyGraph)
					r.Post("/hosts", dfHandler.GetTopologyHostsGraph)
					r.Post("/kubernetes", dfHandler.GetTopologyKubernetesGraph)
					r.Post("/containers", dfHandler.GetTopologyContainersGraph)
					r.Post("/pods", dfHandler.GetTopologyPodsGraph)
				})
				r.Route("/threat", func(r chi.Router) {
					r.Post("/", dfHandler.GetThreatGraph)
					r.Post("/individual", dfHandler.GetIndividualThreatGraph)
				})
			})

			r.Route("/lookup", func(r chi.Router) {
				r.Post("/hosts", dfHandler.GetHosts)
				r.Post("/containers", dfHandler.GetContainers)
				r.Post("/processes", dfHandler.GetProcesses)
				r.Post("/kubernetesclusters", dfHandler.GetKubernetesClusters)
				r.Post("/containerimages", dfHandler.GetContainerImages)
				r.Post("/pods", dfHandler.GetPods)
				r.Post("/registryaccount", dfHandler.GetRegistryAccount)
				r.Post("/cloud-resources", dfHandler.GetCloudResources)
				r.Post("/vulnerabilities", dfHandler.GetVulnerabilities)
				r.Post("/secrets", dfHandler.GetSecrets)
				r.Post("/malwares", dfHandler.GetMalwares)
				r.Post("/compliances", dfHandler.GetCompliances)
				r.Post("/cloud-compliances", dfHandler.GetCloudCompliances)
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
				r.Post("/secret-rules", dfHandler.SearchSecretRules)
				r.Post("/malware-rules", dfHandler.SearchMalwareRules)
				r.Post("/compliance-rules", dfHandler.SearchComplianceRules)
				r.Post("/vulnerability-rules", dfHandler.SearchVulnerabilityRules)
				r.Post("/cloud-resources", dfHandler.SearchCloudResources)
				r.Post("/kubernetes-clusters", dfHandler.SearchKubernetesClusters)
				r.Post("/pods", dfHandler.SearchPods)

				r.Post("/vulnerability/scans", dfHandler.SearchVulnerabilityScans)
				r.Post("/secret/scans", dfHandler.SearchSecretScans)
				r.Post("/malware/scans", dfHandler.SearchMalwareScans)
				r.Post("/compliance/scans", dfHandler.SearchComplianceScans)
				r.Post("/cloud-compliance/scans", dfHandler.SearchCloudComplianceScans)

				r.Post("/cloud-accounts", dfHandler.SearchCloudNodes)

				r.Route("/count", func(r chi.Router) {
					r.Get("/nodes", dfHandler.NodeCount)
					r.Post("/hosts", dfHandler.SearchHostsCount)
					r.Post("/containers", dfHandler.SearchContainersCount)
					r.Post("/images", dfHandler.SearchContainerImagesCount)
					r.Post("/vulnerabilities", dfHandler.SearchVulnerabilitiesCount)
					r.Post("/secrets", dfHandler.SearchSecretsCount)
					r.Post("/malwares", dfHandler.SearchMalwaresCount)
					r.Post("/cloud-compliances", dfHandler.SearchCloudCompliancesCount)
					r.Post("/secret-rules", dfHandler.SearchSecretRulesCount)
					r.Post("/malware-rules", dfHandler.SearchMalwareRulesCount)
					r.Post("/compliance-rules", dfHandler.SearchComplianceRulesCount)
					r.Post("/vulnerability-rules", dfHandler.SearchVulnerabilityRulesCount)
					r.Post("/compliances", dfHandler.SearchCompliancesCount)
					r.Post("/cloud-resources", dfHandler.SearchCloudResourcesCount)
					r.Post("/kubernetes-clusters", dfHandler.SearchKubernetesClustersCount)
					r.Post("/pods", dfHandler.SearchPodsCount)
					r.Post("/cloud-accounts", dfHandler.SearchCloudAccountCount)

					r.Post("/vulnerability/scans", dfHandler.SearchVulnerabilityScansCount)
					r.Post("/secret/scans", dfHandler.SearchSecretScansCount)
					r.Post("/malware/scans", dfHandler.SearchMalwareScansCount)
					r.Post("/compliance/scans", dfHandler.SearchComplianceScansCount)
					r.Post("/cloud-compliance/scans", dfHandler.SearchCloudComplianceScansCount)
				})
			})

			r.Route("/controls", func(r chi.Router) {
				r.Post("/agent", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.GetAgentControls))
				r.Post("/kubernetes-cluster", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.GetKubernetesClusterControls))
				r.Post("/agent-init", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.GetAgentInitControls))
				r.Post("/agent-upgrade", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.ScheduleAgentUpgrade))

				r.Route("/agent-plugins", func(r chi.Router) {
					r.Post("/enable", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.ScheduleAgentPluginsEnable))
					r.Post("/disable", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.ScheduleAgentPluginsDisable))
				})
				r.Post("/cloud-node", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.GetCloudNodeControls))
				r.Post("/cloud-node/enable", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.EnableCloudNodeControls))
				r.Post("/cloud-node/disable", dfHandler.AuthHandler(ResourceScan, PermissionStart, dfHandler.DisableCloudNodeControls))
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
				r.Post("/compliance-scan-logs", dfHandler.AuthHandler(ResourceScanReport, PermissionIngest, dfHandler.IngestComplianceScanStatusHandler))
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
				r.Post("/vulnerability", dfHandler.AuthHandler(ResourceScan, PermissionRead, dfHandler.StatusVulnerabilityScanHandler))
				r.Post("/secret", dfHandler.AuthHandler(ResourceScan, PermissionRead, dfHandler.StatusSecretScanHandler))
				r.Post("/compliance", dfHandler.AuthHandler(ResourceScan, PermissionRead, dfHandler.StatusComplianceScanHandler))
				r.Post("/malware", dfHandler.AuthHandler(ResourceScan, PermissionRead, dfHandler.StatusMalwareScanHandler))
				r.Post("/cloud-compliance", dfHandler.AuthHandler(ResourceScan, PermissionRead, dfHandler.StatusCloudComplianceScanHandler))
			})
			r.Route("/scan/list", func(r chi.Router) {
				r.Post("/vulnerability", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListVulnerabilityScansHandler))
				r.Post("/secret", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListSecretScansHandler))
				r.Post("/compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListComplianceScansHandler))
				r.Post("/malware", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListMalwareScansHandler))
				r.Post("/cloud-compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListCloudComplianceScansHandler))
			})
			r.Route("/scan/results", func(r chi.Router) {
				r.Post("/vulnerability", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListVulnerabilityScanResultsHandler))

				r.Route("/secret", func(r chi.Router) {
					r.Post("/", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListSecretScanResultsHandler))
					r.Post("/rules", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListSecretScanResultRulesHandler))
				})

				r.Route("/malware", func(r chi.Router) {
					r.Post("/", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListMalwareScanResultsHandler))
					r.Post("/rules", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListMalwareScanResultRulesHandler))
					r.Post("/class", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListMalwareScanResultClassHandler))
				})

				r.Post("/compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListComplianceScanResultsHandler))
				r.Post("/cloud-compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ListCloudComplianceScanResultsHandler))

				r.Route("/count", func(r chi.Router) {
					r.Post("/vulnerability", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.CountVulnerabilityScanResultsHandler))
					r.Post("/secret", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.CountSecretScanResultsHandler))
					r.Post("/compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.CountComplianceScanResultsHandler))
					r.Post("/malware", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.CountMalwareScanResultsHandler))
					r.Post("/cloud-compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.CountCloudComplianceScanResultsHandler))
					r.Route("/group", func(r chi.Router) {
						r.Get("/secret", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.GroupSecretResultsHandler))
						r.Route("/malware", func(r chi.Router) {
							r.Get("/", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.GroupMalwareResultsHandler))
							r.Get("/class", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.GroupMalwareClassResultsHandler))
						})
					})
				})
			})

			r.Route("/diff-add", func(r chi.Router) {
				r.Post("/vulnerability", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.DiffAddVulnerabilityScan))
				r.Post("/secret", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.DiffAddSecretScan))
				r.Post("/compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.DiffAddComplianceScan))
				r.Post("/malware", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.DiffAddMalwareScan))
				r.Post("/cloud-compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.DiffAddCloudComplianceScan))
			})

			r.Route("/filters", func(r chi.Router) {
				r.Post("/cloud-compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.CloudComplianceFiltersHandler))
				r.Post("/compliance", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ComplianceFiltersHandler))
			})

			r.Route("/scan/results/action", func(r chi.Router) {
				r.Post("/mask", dfHandler.AuthHandler(ResourceScanReport, PermissionWrite, dfHandler.ScanResultMaskHandler))
				r.Post("/unmask", dfHandler.AuthHandler(ResourceScanReport, PermissionWrite, dfHandler.ScanResultUnmaskHandler))
				r.Patch("/delete", dfHandler.AuthHandler(ResourceScanReport, PermissionDelete, dfHandler.ScanResultDeleteHandler))
				r.Post("/notify", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ScanResultNotifyHandler))
			})

			r.Post("/scans/bulk/delete", dfHandler.AuthHandler(ResourceScanReport, PermissionDelete, dfHandler.BulkDeleteScans))

			r.Route("/scan/{scan_type}/{scan_id}", func(r chi.Router) {
				r.Get("/download", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.ScanResultDownloadHandler))
				r.Delete("/", dfHandler.AuthHandler(ResourceScanReport, PermissionDelete, dfHandler.ScanDeleteHandler))
			})
			r.Post("/scan/nodes-in-result", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.GetAllNodesInScanResultBulkHandler))

			r.Route("/scan/sbom", func(r chi.Router) {
				r.Post("/", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.GetSbomHandler))
				r.Post("/download", dfHandler.AuthHandler(ResourceScanReport, PermissionRead, dfHandler.SbomDownloadHandler))
			})

			r.Route("/registryaccount", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler(ResourceRegistry, PermissionRead, dfHandler.ListRegistry))
				r.Post("/", dfHandler.AuthHandler(ResourceRegistry, PermissionWrite, dfHandler.AddRegistry))
				r.Post("/gcr", dfHandler.AuthHandler(ResourceRegistry, PermissionWrite, dfHandler.AddGoogleContainerRegistry))
				r.Get("/{registry_type}/summary-by-type", dfHandler.AuthHandler(ResourceRegistry, PermissionRead, dfHandler.SummaryByRegistryType))
				r.Get("/summary", dfHandler.AuthHandler(ResourceRegistry, PermissionRead, dfHandler.Summary))
				r.Route("/{registry_id}", func(r chi.Router) {
					r.Put("/", dfHandler.AuthHandler(ResourceRegistry, PermissionWrite, dfHandler.UpdateRegistry))
					r.Delete("/", dfHandler.AuthHandler(ResourceRegistry, PermissionDelete, dfHandler.DeleteRegistry))
					r.Get("/summary", dfHandler.AuthHandler(ResourceRegistry, PermissionRead, dfHandler.RegistrySummary))
					r.Post("/sync", dfHandler.AuthHandler(ResourceRegistry, PermissionWrite, dfHandler.RefreshRegistry))
				})
				r.Post("/images", dfHandler.AuthHandler(ResourceRegistry, PermissionRead, dfHandler.ListImages))
				r.Post("/stubs", dfHandler.AuthHandler(ResourceRegistry, PermissionRead, dfHandler.ListImageStubs))
				// count api
				r.Route("/count", func(r chi.Router) {
					r.Post("/images", dfHandler.AuthHandler(ResourceRegistry, PermissionRead, dfHandler.CountImages))
					r.Post("/stubs", dfHandler.AuthHandler(ResourceRegistry, PermissionRead, dfHandler.CountImageStubs))
				})
			})

			r.Route("/diagnosis", func(r chi.Router) {
				r.Get("/notification", dfHandler.AuthHandler(ResourceDiagnosis, PermissionRead, dfHandler.DiagnosticNotification))
				r.Post("/console-logs", dfHandler.AuthHandler(ResourceDiagnosis, PermissionGenerate, dfHandler.GenerateConsoleDiagnosticLogs))
				r.Route("/agent-logs", func(r chi.Router) {
					r.Post("/", dfHandler.AuthHandler(ResourceDiagnosis, PermissionGenerate, dfHandler.GenerateAgentDiagnosticLogs))
					r.Put("/status/{node_id}", dfHandler.AuthHandler(ResourceDiagnosis, PermissionGenerate, dfHandler.UpdateAgentDiagnosticLogsStatus))
				})
				r.Get("/diagnostic-logs", dfHandler.AuthHandler(ResourceDiagnosis, PermissionRead, dfHandler.GetDiagnosticLogs))
			})

			// Reports
			r.Route("/reports", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler(ResourceReport, PermissionRead, dfHandler.ListReports))
				r.Get("/{report_id}", dfHandler.AuthHandler(ResourceReport, PermissionRead, dfHandler.GetReport))
				r.Post("/", dfHandler.AuthHandler(ResourceReport, PermissionGenerate, dfHandler.GenerateReport))
				r.Delete("/{report_id}", dfHandler.AuthHandler(ResourceReport, PermissionDelete, dfHandler.DeleteReport))
			})

			r.Route("/scheduled-task", func(r chi.Router) {
				r.Get("/", dfHandler.AuthHandler(ResourceAllUsers, PermissionRead, dfHandler.GetScheduledTask))
				r.Patch("/{id}", dfHandler.AuthHandler(ResourceAllUsers, PermissionWrite, dfHandler.UpdateScheduledTask))
				r.Post("/", dfHandler.AuthHandler(ResourceIntegration, PermissionWrite, dfHandler.AddScheduledTask))
			})

			// Integration
			r.Route("/integration", func(r chi.Router) {
				r.Post("/", dfHandler.AuthHandler(ResourceIntegration, PermissionWrite, dfHandler.AddIntegration))
				r.Get("/", dfHandler.AuthHandler(ResourceIntegration, PermissionRead, dfHandler.GetIntegrations))
				r.Route("/{integration_id}", func(r chi.Router) {
					r.Delete("/", dfHandler.AuthHandler(ResourceIntegration, PermissionDelete, dfHandler.DeleteIntegration))
					r.Put("/", dfHandler.AuthHandler(ResourceIntegration, PermissionUpdate, doNothingHandler))
				})
			})

			// vulnerability db management
			r.Route("/database", func(r chi.Router) {
				r.Put("/vulnerability", dfHandler.AuthHandler(ResourceSettings, PermissionWrite, dfHandler.UploadVulnerabilityDB))
			})

		})
	})

	return nil
}

func doNothingHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func newAuthorizationHandler() (*casbin.Enforcer, error) {
	return casbin.NewEnforcer("auth/model.conf", "auth/policy.csv")
}

func IsSaasDeployment() bool {
	return strings.ToLower(os.Getenv("DEEPFENCE_SAAS_DEPLOYMENT")) == "true"
}
