package apiDocs

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"net/http"
)

type ScanTrigger struct {
	NodeId string `json:"node_id"`
}

func (d *OpenApiDocs) AddUserAuthOperations() {
	d.AddOperation("registerUser", http.MethodPost, "/deepfence/user/register",
		"Register User", "First user registration. Further users needs to be invited.",
		http.StatusOK, []string{tagUser}, nil, nil, new(model.UserRegisterRequest), model.Response{Success: true, Data: model.ResponseAccessToken{}})
	d.AddOperation("authToken", http.MethodPost, "/deepfence/auth/token",
		"API Auth Token", "Get auth token for API access",
		http.StatusOK, []string{tagAuthentication}, nil, nil, new(model.ApiAuthRequest), model.Response{Success: true, Data: model.ResponseAccessToken{}})
	d.AddOperation("login", http.MethodPost, "/deepfence/user/login",
		"Login API", "Login API",
		http.StatusOK, []string{tagAuthentication}, nil, nil, new(model.LoginRequest), model.Response{Success: true, Data: model.ResponseAccessToken{}})
	d.AddOperation("logout", http.MethodPost, "/deepfence/user/logout",
		"Logout API", "Logout API",
		http.StatusNoContent, []string{tagAuthentication}, nil, bearerToken, nil, nil)
}

func (d *OpenApiDocs) AddUserOperations() {
	d.AddOperation("getCurrentUser", http.MethodGet, "/deepfence/user",
		"Get Current User", "Get logged in user information",
		http.StatusOK, []string{tagUser}, nil, bearerToken, nil, model.Response{Success: true, Data: model.User{}})
	d.AddOperation("updateCurrentUser", http.MethodPut, "/deepfence/user",
		"Update Current User", "Update logged in user information",
		http.StatusOK, []string{tagUser}, nil, bearerToken, new(model.User), model.Response{Success: true, Data: model.User{}})
	d.AddOperation("deleteCurrentUser", http.MethodDelete, "/deepfence/user",
		"Delete Current User", "Delete logged in user",
		http.StatusNoContent, []string{tagUser}, nil, bearerToken, nil, nil)
	d.AddOperation("getApiTokens", http.MethodGet, "/deepfence/api-token",
		"Get User's API Tokens", "Get logged in user's API Tokens",
		http.StatusOK, []string{tagUser}, nil, bearerToken, nil, model.Response{Success: true, Data: []postgresql_db.ApiToken{}})
}

func (d *OpenApiDocs) AddGraphOperations() {
	d.AddOperation("getTopologyGraph", http.MethodGet, "/deepfence/graph/topology",
		"Get Topology Graph", "Retrieve the full topology graph associated with the account",
		http.StatusOK, []string{tagTopology}, nil, bearerToken, new(reporters.TopologyFilters), new(reporters.RenderedGraph))

	d.AddOperation("getThreatGraph", http.MethodGet, "/deepfence/graph/threat",
		"Get Threat Graph", "Retrieve the full threat graph associated with the account",
		http.StatusOK, []string{tagThreat}, nil, bearerToken, nil, new(reporters.ThreatGraph))
}

func (d *OpenApiDocs) AddIngestersOperations() {
	d.AddOperation("ingestAgentReport", http.MethodPost, "/deepfence/ingest/report",
		"Ingest Topology Data", "Ingest data reported by one Agent",
		http.StatusOK, []string{tagTopology}, nil, bearerToken, new(ingesters.ReportIngestionData), new(controls.AgentControls))

	d.AddOperation("ingestCVEs", http.MethodPost, "/deepfence/ingest/cves",
		"Ingest CVEs", "Ingest CVEs found while scanning the agent",
		http.StatusOK, []string{tagVulnerability}, nil, bearerToken, new([]ingesters.DfCveStruct), nil)

	d.AddOperation("ingestSecrets", http.MethodPost, "/deepfence/ingest/secrets",
		"Ingest Secrets", "Ingest secrets found while scanning the agent",
		http.StatusOK, []string{tagSecretScan}, nil, bearerToken, new([]ingesters.Secret), nil)

	d.AddOperation("ingestMalware", http.MethodPost, "/deepfence/ingest/malware",
		"Ingest Malware", "Ingest malware found while scanning the agent",
		http.StatusOK, []string{tagMalwareScan}, nil, bearerToken, new([]ingesters.Malware), nil)

	d.AddOperation("ingestCompliances", http.MethodPost, "/deepfence/ingest/compliance",
		"Ingest Compliances", "Ingest compliance issues found while scanning the agent",
		http.StatusOK, []string{tagCompliance}, nil, bearerToken, new([]ingesters.ComplianceDoc), nil)

	d.AddOperation("ingestCloudCompliances", http.MethodPost, "/deepfence/ingest/cloud-compliance",
		"Ingest Cloud Compliances", "Ingest Cloud compliances found while scanning cloud provider",
		http.StatusOK, []string{tagCloudCompliance}, nil, bearerToken, new([]ingesters.CloudComplianceDoc), nil)

	d.AddOperation("ingestCloudResources", http.MethodPost, "/deepfence/ingest/cloud-resources",
		"Ingest Cloud resources", "Ingest Clouds Resources found while scanning cloud provider",
		http.StatusOK, []string{tagCloudResources}, nil, bearerToken, new([]ingesters.CloudResource), nil)

}

func (d *OpenApiDocs) AddScansOperations() {
	d.AddOperation("startCVEScan", http.MethodGet, "/deepfence/scan/start/cves",
		"Start CVE Scan", "Start CVE Scan on agent",
		http.StatusOK, []string{tagVulnerability}, nil, bearerToken, new(ScanTrigger), nil)

	d.AddOperation("startSecretScan", http.MethodGet, "/deepfence/scan/start/secrets",
		"Start Secret Scan", "Start Secret Scan on agent",
		http.StatusOK, []string{tagSecretScan}, nil, bearerToken, new(ScanTrigger), nil)

	d.AddOperation("startMalwareScan", http.MethodGet, "/deepfence/scan/start/malware",
		"Start Malware Scan", "Start Malware Scan on agent",
		http.StatusOK, []string{tagMalwareScan}, nil, bearerToken, new(ScanTrigger), nil)

	d.AddOperation("startComplianceScan", http.MethodGet, "/deepfence/scan/start/compliances",
		"Start Compliance Scan", "Start Compliance Scan on agent",
		http.StatusOK, []string{tagCompliance}, nil, bearerToken, new(ScanTrigger), nil)

}
