package apiDocs

import (
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/diagnosis"
	"github.com/weaveworks/scope/render/detailed"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	ingester "github.com/deepfence/ThreatMapper/deepfence_worker/ingesters"
	"github.com/deepfence/golang_deepfence_sdk/utils/controls"
	postgresqldb "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	"github.com/deepfence/golang_deepfence_sdk/utils/report"
	utils "github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

func (d *OpenApiDocs) AddUserAuthOperations() {
	d.AddOperation("registerUser", http.MethodPost, "/deepfence/user/register",
		"Register User", "First user registration. Further users needs to be invited.",
		http.StatusOK, []string{tagUser}, nil, new(model.UserRegisterRequest), new(model.ResponseAccessToken))
	d.AddOperation("authToken", http.MethodPost, "/deepfence/auth/token",
		"Get Access Token for API Token", "Get access token for programmatic API access, by providing API Token",
		http.StatusOK, []string{tagAuthentication}, nil, new(model.ApiAuthRequest), new(model.ResponseAccessToken))
	d.AddOperation("authTokenRefresh", http.MethodPost, "/deepfence/auth/token/refresh",
		"Refresh access token", "Reissue access token using refresh token",
		http.StatusOK, []string{tagAuthentication}, bearerToken, nil, new(model.ResponseAccessToken))
	d.AddOperation("login", http.MethodPost, "/deepfence/user/login",
		"Login API", "Login API",
		http.StatusOK, []string{tagAuthentication}, nil, new(model.LoginRequest), new(model.ResponseAccessToken))
	d.AddOperation("logout", http.MethodPost, "/deepfence/user/logout",
		"Logout API", "Logout API",
		http.StatusNoContent, []string{tagAuthentication}, bearerToken, nil, nil)
}

func (d *OpenApiDocs) AddUserOperations() {
	d.AddOperation("getCurrentUser", http.MethodGet, "/deepfence/user",
		"Get Current User", "Get logged in user information",
		http.StatusOK, []string{tagUser}, bearerToken, nil, new(model.User))
	d.AddOperation("updateCurrentUser", http.MethodPut, "/deepfence/user",
		"Update Current User", "Update logged in user information",
		http.StatusOK, []string{tagUser}, bearerToken, new(model.User), new(model.User))
	d.AddOperation("deleteCurrentUser", http.MethodDelete, "/deepfence/user",
		"Delete Current User", "Delete logged in user",
		http.StatusNoContent, []string{tagUser}, bearerToken, nil, nil)
	d.AddOperation("getApiTokens", http.MethodGet, "/deepfence/api-token",
		"Get User's API Tokens", "Get logged in user's API Tokens",
		http.StatusOK, []string{tagUser}, bearerToken, nil, new([]postgresqldb.ApiToken))

	d.AddOperation("resetPasswordRequest", http.MethodPost, "/deepfence/user/reset-password/request",
		"Reset Password Request", "Request for resetting the password",
		http.StatusOK, []string{tagUser}, nil, new(model.PasswordResetRequest), new(model.MessageResponse))
	d.AddOperation("verifyResetPasswordRequest", http.MethodPost, "/deepfence/user/reset-password/verify",
		"Verify and Reset Password", "Verify code and reset the password",
		http.StatusOK, []string{tagUser}, nil, new(model.PasswordResetVerifyRequest), nil)

	d.AddOperation("inviteUser", http.MethodPost, "/deepfence/user/invite",
		"Invite User", "Invite a user",
		http.StatusOK, []string{tagUser}, bearerToken, new(model.InviteUserRequest), new(model.InviteUserResponse))
	d.AddOperation("registerInvitedUser", http.MethodPost, "/deepfence/user/invite/register",
		"Register Invited User", "Register invited user",
		http.StatusOK, []string{tagUser}, nil, new(model.RegisterInvitedUserRequest), new(model.ResponseAccessToken))
}

func (d *OpenApiDocs) AddGraphOperations() {
	type GraphResult struct {
		Nodes detailed.NodeSummaries               `json:"nodes" required:"true"`
		Edges detailed.TopologyConnectionSummaries `json:"edges" required:"true"`
	}
	d.AddOperation("getTopologyGraph", http.MethodPost, "/deepfence/graph/topology/",
		"Get Topology Graph", "Retrieve the full topology graph associated with the account",
		http.StatusOK, []string{tagTopology}, bearerToken, new(reporters.TopologyFilters), new(GraphResult))

	d.AddOperation("getHostsTopologyGraph", http.MethodPost, "/deepfence/graph/topology/hosts",
		"Get Hosts Topology Graph", "Retrieve the full topology graph associated with the account from Hosts",
		http.StatusOK, []string{tagTopology}, bearerToken, new(reporters.TopologyFilters), new(GraphResult))

	d.AddOperation("getKubernetesTopologyGraph", http.MethodPost, "/deepfence/graph/topology/kubernetes",
		"Get Kubernetes Topology Graph", "Retrieve the full topology graph associated with the account from Kubernetes",
		http.StatusOK, []string{tagTopology}, bearerToken, new(reporters.TopologyFilters), new(GraphResult))

	d.AddOperation("getContainersTopologyGraph", http.MethodPost, "/deepfence/graph/topology/containers",
		"Get Containers Topology Graph", "Retrieve the full topology graph associated with the account from Containers",
		http.StatusOK, []string{tagTopology}, bearerToken, new(reporters.TopologyFilters), new(GraphResult))

	d.AddOperation("getPodsTopologyGraph", http.MethodPost, "/deepfence/graph/topology/pods",
		"Get Pods Topology Graph", "Retrieve the full topology graph associated with the account from Pods",
		http.StatusOK, []string{tagTopology}, bearerToken, new(reporters.TopologyFilters), new(GraphResult))

	d.AddOperation("getThreatGraph", http.MethodPost, "/deepfence/graph/threat",
		"Get Threat Graph", "Retrieve the full threat graph associated with the account",
		http.StatusOK, []string{tagThreat}, bearerToken, nil, new(reporters.ThreatGraph))
}

func (d *OpenApiDocs) AddLookupOperations() {
	d.AddOperation("getHosts", http.MethodPost, "/deepfence/lookup/hosts",
		"Retrieve Hosts data", "Retrieve all the data associated with hosts",
		http.StatusOK, []string{tagLookup}, bearerToken, new(reporters.LookupFilter), new([]model.Host))

	d.AddOperation("getContainers", http.MethodPost, "/deepfence/lookup/containers",
		"Retrieve Containers data", "Retrieve all the data associated with containers",
		http.StatusOK, []string{tagLookup}, bearerToken, new(reporters.LookupFilter), new([]model.Container))

	d.AddOperation("getProcesses", http.MethodPost, "/deepfence/lookup/processes",
		"Retrieve Processes data", "Retrieve all the data associated with processes",
		http.StatusOK, []string{tagLookup}, bearerToken, new(reporters.LookupFilter), new([]model.Process))

	d.AddOperation("getKubernetesClusters", http.MethodPost, "/deepfence/lookup/kubernetesclusters",
		"Retrieve K8s data", "Retrieve all the data associated with k8s clusters",
		http.StatusOK, []string{tagLookup}, bearerToken, new(reporters.LookupFilter), new([]model.KubernetesCluster))

	d.AddOperation("getPods", http.MethodPost, "/deepfence/lookup/pods",
		"Retrieve Pods data", "Retrieve all the data associated with pods",
		http.StatusOK, []string{tagLookup}, bearerToken, new(reporters.LookupFilter), new([]model.Pod))

	d.AddOperation("getContainerImages", http.MethodPost, "/deepfence/lookup/containerimages",
		"Retrieve Container Images data", "Retrieve all the data associated with images",
		http.StatusOK, []string{tagLookup}, bearerToken, new(reporters.LookupFilter), new([]model.ContainerImage))

	d.AddOperation("getRegistryAccount", http.MethodPost, "/deepfence/lookup/registryaccount",
		"Get Images in Registry", "List all the images present in the given registry",
		http.StatusOK, []string{tagLookup}, bearerToken, new(reporters.LookupFilter), new([]model.RegistryAccount))
}

func (d *OpenApiDocs) AddControlsOperations() {
	d.AddOperation("getAgentControls", http.MethodPost, "/deepfence/controls/agent",
		"Fetch Agent Actions", "Fetch actions for a given agent",
		http.StatusOK, []string{tagControls}, bearerToken, new(model.AgentId), new(controls.AgentControls))

	d.AddOperation("getKubernetesClusterControls", http.MethodPost, "/deepfence/controls/kubernetes-cluster",
		"Fetch Kubernetes Cluster Actions", "Fetch actions for a given Kubernetes Cluster",
		http.StatusOK, []string{tagControls}, bearerToken, new(model.AgentId), new(controls.AgentControls))

	d.AddOperation("getAgentInitControls", http.MethodPost, "/deepfence/controls/agent-init",
		"Fetch Agent Init Actions", "Fetch initial actions for a given agent after it started",
		http.StatusOK, []string{tagControls}, bearerToken, new(model.InitAgentReq), new(controls.AgentControls))

	d.AddOperation("upgradeAgentVersion", http.MethodPost, "/deepfence/controls/agent-upgrade",
		"Schedule new agent version upgrade", "Schedule new agent version upgrade",
		http.StatusOK, []string{tagControls}, bearerToken, new(model.AgentUpgrade), nil)
}

func (d *OpenApiDocs) AddCloudNodeOperations() {
	d.AddOperation("registerCloudNodeAccount", http.MethodPost, "/deepfence/cloud-node/account",
		"Register Cloud Node Account", "Register Cloud Node Account and return any pending compliance scans from console",
		http.StatusOK, []string{tagCloudNodes}, bearerToken, new(model.CloudNodeAccountRegisterReq), new(model.CloudNodeAccountRegisterResp))
	d.AddOperation("listCloudNodeAccount", http.MethodPost, "/deepfence/cloud-node/accounts/list",
		"List Cloud Node Accounts", "List Cloud Node Accounts registered with the console",
		http.StatusOK, []string{tagCloudNodes}, bearerToken, new(model.CloudNodeAccountsListReq), new(model.CloudNodeAccountsListResp))
	d.AddOperation("listCloudProviders", http.MethodPost, "/deepfence/cloud-node/providers/list",
		"List Cloud Node Providers", "List Cloud Node Providers registered with the console",
		http.StatusOK, []string{tagCloudNodes}, bearerToken, new(model.CloudNodeProvidersListReq), new(model.CloudNodeProvidersListResp))
}

func (d *OpenApiDocs) AddIngestersOperations() {
	d.AddOperation("ingestAgentReport", http.MethodPost, "/deepfence/ingest/report",
		"Ingest Topology Data", "Ingest data reported by one Agent",
		http.StatusOK, []string{tagTopology}, bearerToken, new(report.RawReport), nil)

	d.AddOperation("ingestSyncAgentReport", http.MethodPost, "/deepfence/ingest/sync-report",
		"Ingest Topology Data", "Ingest data reported by one Agent",
		http.StatusOK, []string{tagTopology}, bearerToken, new(ingesters.ReportIngestionData), nil)

	d.AddOperation("ingestSbom", http.MethodPost, "/deepfence/ingest/sbom",
		"Ingest SBOM from Scan", "Ingest SBOM from Scan",
		http.StatusOK, []string{tagVulnerability}, bearerToken, new(utils.SbomRequest), nil)

	d.AddOperation("ingestVulnerabilities", http.MethodPost, "/deepfence/ingest/vulnerabilities",
		"Ingest Vulnerabilities", "Ingest vulnerabilities found while scanning the agent host or containers",
		http.StatusOK, []string{tagVulnerability}, bearerToken, new([]ingester.Vulnerability), nil)

	d.AddOperation("ingestVulnerabilitiesScanStatus", http.MethodPost, "/deepfence/ingest/vulnerabilities-scan-logs",
		"Ingest Vulnerabilities Scan Status", "Ingest vulnerabilities scan status from agent",
		http.StatusOK, []string{tagVulnerability}, bearerToken, new([]ingester.VulnerabilityScanStatus), nil)

	d.AddOperation("ingestSecrets", http.MethodPost, "/deepfence/ingest/secrets",
		"Ingest Secrets", "Ingest secrets found while scanning the agent",
		http.StatusOK, []string{tagSecretScan}, bearerToken, new([]ingester.Secret), nil)

	d.AddOperation("ingestSecretScanStatus", http.MethodPost, "/deepfence/ingest/secret-scan-logs",
		"Ingest Secrets Scan Status", "Ingest secrets scan status from the agent",
		http.StatusOK, []string{tagSecretScan}, bearerToken, new([]ingester.SecretScanStatus), nil)

	d.AddOperation("ingestCompliances", http.MethodPost, "/deepfence/ingest/compliance",
		"Ingest Compliances", "Ingest compliance issues found while scanning the agent",
		http.StatusOK, []string{tagCompliance}, bearerToken, new([]ingester.Compliance), nil)

	d.AddOperation("ingestCloudCompliances", http.MethodPost, "/deepfence/ingest/cloud-compliance",
		"Ingest Cloud Compliances", "Ingest Cloud compliances found while scanning cloud provider",
		http.StatusOK, []string{tagCloudScanner}, bearerToken, new([]ingester.CloudCompliance), nil)

	d.AddOperation("ingestMalwareScanStatus", http.MethodPost, "/deepfence/ingest/malware-scan-logs",
		"Ingest Malware Scan Status", "Ingest malware scan status from the agent",
		http.StatusOK, []string{tagMalwareScan}, bearerToken, new([]ingester.MalwareScanStatus), nil)

	d.AddOperation("ingestMalware", http.MethodPost, "/deepfence/ingest/malware",
		"Ingest Malware", "Ingest malware found while scanning the agent",
		http.StatusOK, []string{tagMalwareScan}, bearerToken, new([]ingester.Malware), nil)

	d.AddOperation("ingestCloudResources", http.MethodPost, "/deepfence/ingest/cloud-resources",
		"Ingest Cloud resources", "Ingest Clouds Resources found while scanning cloud provider",
		http.StatusOK, []string{tagCloudResources}, bearerToken, new([]ingesters.CloudResource), nil)
}

func (d *OpenApiDocs) AddScansOperations() {
	// Start scan
	d.AddOperation("startVulnerabilityScan", http.MethodPost, "/deepfence/scan/start/vulnerability",
		"Start Vulnerability Scan", "Start Vulnerability Scan on agent or registry",
		http.StatusAccepted, []string{tagVulnerability}, bearerToken, new(model.VulnerabilityScanTriggerReq), new(model.ScanTriggerResp))
	d.AddOperation("startSecretScan", http.MethodPost, "/deepfence/scan/start/secret",
		"Start Secret Scan", "Start Secret Scan on agent or registry",
		http.StatusAccepted, []string{tagSecretScan}, bearerToken, new(model.SecretScanTriggerReq), new(model.ScanTriggerResp))
	d.AddOperation("startComplianceScan", http.MethodPost, "/deepfence/scan/start/compliance",
		"Start Compliance Scan", "Start Compliance Scan on agent or registry",
		http.StatusAccepted, []string{tagCompliance}, bearerToken, new(model.ComplianceScanTriggerReq), new(model.ScanTriggerResp))
	d.AddOperation("startMalwareScan", http.MethodPost, "/deepfence/scan/start/malware",
		"Start Malware Scan", "Start Malware Scan on agent or registry",
		http.StatusAccepted, []string{tagMalwareScan}, bearerToken, new(model.MalwareScanTriggerReq), new(model.ScanTriggerResp))
	d.AddOperation("startCloudComplianceScans", http.MethodPost, "/deepfence/scan/start/cloud-compliance",
		"Start Cloud Compliance Scans", "Start Cloud Compliance Scans on cloud nodes", http.StatusAccepted,
		[]string{tagCloudScanner}, bearerToken, new(model.CloudComplianceScanTriggerReq), new(model.ScanTriggerResp))

	// Stop scan
	d.AddOperation("stopVulnerabilityScan", http.MethodPost, "/deepfence/scan/stop/vulnerability",
		"Stop Vulnerability Scan", "Stop Vulnerability Scan on agent or registry",
		http.StatusAccepted, []string{tagVulnerability}, bearerToken, new(model.VulnerabilityScanTriggerReq), nil)
	d.AddOperation("stopSecretScan", http.MethodPost, "/deepfence/scan/stop/secret",
		"Stop Secret Scan", "Stop Secret Scan on agent or registry",
		http.StatusAccepted, []string{tagSecretScan}, bearerToken, new(model.SecretScanTriggerReq), nil)
	d.AddOperation("stopComplianceScan", http.MethodPost, "/deepfence/scan/stop/compliance",
		"Stop Compliance Scan", "Stop Compliance Scan on agent or registry",
		http.StatusAccepted, []string{tagCompliance}, bearerToken, new(model.ComplianceScanTriggerReq), nil)
	d.AddOperation("stopMalwareScan", http.MethodPost, "/deepfence/scan/stop/malware",
		"Stop Malware Scan", "Stop Malware Scan on agent or registry",
		http.StatusAccepted, []string{tagMalwareScan}, bearerToken, new(model.MalwareScanTriggerReq), nil)

	// Status scan
	d.AddOperation("statusVulnerabilityScan", http.MethodGet, "/deepfence/scan/status/vulnerability",
		"Get Vulnerability Scan Status", "Get Vulnerability Scan Status on agent or registry",
		http.StatusOK, []string{tagVulnerability}, bearerToken, new(model.ScanStatusReq), new(model.ScanStatusResp))
	d.AddOperation("statusSecretScan", http.MethodGet, "/deepfence/scan/status/secret",
		"Get Secret Scan Status", "Get Secret Scan Status on agent or registry",
		http.StatusOK, []string{tagSecretScan}, bearerToken, new(model.ScanStatusReq), new(model.ScanStatusResp))
	d.AddOperation("statusComplianceScan", http.MethodGet, "/deepfence/scan/status/compliance",
		"Get Compliance Scan Status", "Get Compliance Scan Status on agent or registry",
		http.StatusOK, []string{tagCompliance}, bearerToken, new(model.ScanStatusReq), new(model.ScanStatusResp))
	d.AddOperation("statusMalwareScan", http.MethodGet, "/deepfence/scan/status/malware",
		"Get Malware Scan Status", "Get Malware Scan status on agent or registry",
		http.StatusOK, []string{tagMalwareScan}, bearerToken, new(model.ScanStatusReq), new(model.ScanStatusResp))

	// List scans
	d.AddOperation("listVulnerabilityScans", http.MethodPost, "/deepfence/scan/list/vulnerability",
		"Get Vulnerability Scans List", "Get Vulnerability Scan list on agent or registry",
		http.StatusOK, []string{tagVulnerability}, bearerToken, new(model.ScanListReq), new(model.ScanListResp))
	d.AddOperation("listSecretScan", http.MethodPost, "/deepfence/scan/list/secret",
		"Get Secret Scans List", "Get Secret Scans list on agent or registry",
		http.StatusOK, []string{tagSecretScan}, bearerToken, new(model.ScanListReq), new(model.ScanListResp))
	d.AddOperation("listComplianceScan", http.MethodPost, "/deepfence/scan/list/compliance",
		"Get Compliance Scans List", "Get Compliance Scans list on agent or registry",
		http.StatusOK, []string{tagCompliance}, bearerToken, new(model.ScanListReq), new(model.ScanListResp))
	d.AddOperation("listMalwareScan", http.MethodPost, "/deepfence/scan/list/malware",
		"Get Malware Scans List", "Get Malware Scans list on agent or registry",
		http.StatusOK, []string{tagMalwareScan}, bearerToken, new(model.ScanListReq), new(model.ScanListResp))

	// Scans' Results
	d.AddOperation("resultsVulnerabilityScans", http.MethodPost, "/deepfence/scan/results/vulnerability",
		"Get Vulnerability Scans Results", "Get Vulnerability Scan results on agent or registry",
		http.StatusOK, []string{tagVulnerability}, bearerToken, new(model.ScanResultsReq), new(model.VulnerabilityScanResult))
	d.AddOperation("resultsSecretScan", http.MethodPost, "/deepfence/scan/results/secret",
		"Get Secret Scans Results", "Get Secret Scans results on agent or registry",
		http.StatusOK, []string{tagSecretScan}, bearerToken, new(model.ScanResultsReq), new(model.SecretScanResult))
	d.AddOperation("resultsComplianceScan", http.MethodPost, "/deepfence/scan/results/compliance",
		"Get Compliance Scans Results", "Get Compliance Scans results on agent or registry",
		http.StatusOK, []string{tagCompliance}, bearerToken, new(model.ScanResultsReq), new(model.ComplianceScanResult))
	d.AddOperation("resultsMalwareScan", http.MethodPost, "/deepfence/scan/results/malware",
		"Get Malware Scans Results", "Get Malware Scans results on agent or registry",
		http.StatusOK, []string{tagMalwareScan}, bearerToken, new(model.ScanResultsReq), new(model.MalwareScanResult))
}

func (d *OpenApiDocs) AddDiagnosisOperations() {
	d.AddOperation("diagnosticNotification", http.MethodGet, "/deepfence/diagnosis/notification",
		"Get Diagnostic Notification", "Get Diagnostic Notification",
		http.StatusOK, []string{tagDiagnosis}, bearerToken, nil, new([]diagnosis.DiagnosticNotification))
	d.AddOperation("generateConsoleDiagnosticLogs", http.MethodPost, "/deepfence/diagnosis/console-logs",
		"Generate Console Diagnostic Logs", "Generate Console Diagnostic Logs",
		http.StatusAccepted, []string{tagDiagnosis}, bearerToken, nil, nil)
	d.AddOperation("generateAgentDiagnosticLogs", http.MethodPost, "/deepfence/diagnosis/agent-logs",
		"Generate Agent Diagnostic Logs", "Generate Agent Diagnostic Logs",
		http.StatusAccepted, []string{tagDiagnosis}, bearerToken, nil, nil)
	d.AddOperation("getDiagnosticLogs", http.MethodGet, "/deepfence/diagnosis/diagnostic-logs",
		"Get Diagnostic Logs", "Get diagnostic logs download url links",
		http.StatusOK, []string{tagDiagnosis}, bearerToken, nil, nil)
}

func (d *OpenApiDocs) AddRegistryOperations() {
	d.AddOperation("listRegistry", http.MethodGet, "/deepfence/registryaccount/list",
		"List Registries", "List all the added Registries",
		http.StatusOK, []string{tagRegistry}, bearerToken, new(model.RegistryListReq), new([]postgresqldb.GetContainerRegistriesSafeRow))
	d.AddOperation("addRegistry", http.MethodPost, "/deepfence/registryaccount/",
		"Add Registry", "Add a new supported registry",
		http.StatusOK, []string{tagRegistry}, bearerToken, new(model.RegistryAddReq), nil)
}
