package apiDocs

import (
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
)

type ScanTrigger struct {
	NodeId string `json:"node_id"`
}

var bearer_token = []map[string][]string{{securityName: {}}}

func (d *OpenApiDocs) AddUserAuthOperations() {
	d.AddOperation("registerUser", http.MethodPost, "/deepfence/user/register", "Register User", "First user registration. Further users needs to be invited.",
		[]string{tagAuthentication}, nil, nil, new(model.User), new(model.ResponseAccessToken))
}

func (d *OpenApiDocs) AddGraphOperations() {
	d.AddOperation("getTopologyGraph", http.MethodGet, "/deepfence/graph/topology", "Get Topology Graph", "Retrieve the full topology graph associated with the account",
		[]string{tagTopology}, nil, bearer_token, new(reporters.TopologyFilters), new(reporters.RenderedGraph))

	d.AddOperation("getThreatGraph", http.MethodGet, "/deepfence/graph/threat", "Get Threat Graph", "Retrieve the full threat graph associated with the account",
		[]string{tagThreat}, nil, bearer_token, nil, new(reporters.ThreatGraph))
}

func (d *OpenApiDocs) AddIngestersOperations() {
	d.AddOperation("ingestAgentReport", http.MethodPost, "/deepfence/ingest/report", "Ingest Topology Data", "Ingest data reported by one Agent",
		[]string{tagTopology}, nil, bearer_token, new(ingesters.ReportIngestionData), new(controls.AgentControls))

	d.AddOperation("ingestCVEs", http.MethodPost, "/deepfence/ingest/cves", "Ingest CVEs", "Ingest CVEs found while scanning the agent",
		[]string{tagVulnerability}, nil, bearer_token, new([]ingesters.DfCveStruct), nil)

	d.AddOperation("ingestSecrets", http.MethodPost, "/deepfence/ingest/secrets", "Ingest Secrets", "Ingest secrets found while scanning the agent",
		[]string{tagSecretScan}, nil, bearer_token, new([]ingesters.Secret), nil)

	d.AddOperation("ingestCompliances", http.MethodPost, "/deepfence/ingest/compliance", "Ingest Compliances", "Ingest compliance issues found while scanning the agent",
		[]string{tagCompliance}, nil, bearer_token, new([]ingesters.ComplianceDoc), nil)

	d.AddOperation("ingestCloudCompliances", http.MethodPost, "/deepfence/ingest/cloud-compliance", "Ingest Cloud Compliances", "Ingest Cloud compliances found while scanning cloud provider",
		[]string{tagCloudCompliance}, nil, bearer_token, new([]ingesters.CloudComplianceDoc), nil)

	d.AddOperation("ingestCloudResources", http.MethodPost, "/deepfence/ingest/cloud-resources", "Ingest Cloud resources", "Ingest Clouds Resources found while scanning cloud provider",
		[]string{tagCloudResources}, nil, bearer_token, new([]ingesters.CloudResource), nil)

}

func (d *OpenApiDocs) AddScansOperations() {
	d.AddOperation("startCVEScan", http.MethodGet, "/deepfence/scan/start/cves",
		"Start CVE Scan", "Start CVE Scan on agent",
		[]string{tagVulnerability}, nil, bearer_token, new(ScanTrigger), nil)

	d.AddOperation("startSecretScan", http.MethodGet, "/deepfence/scan/start/secrets",
		"Start Secret Scan", "Start Secret Scan on agent",
		[]string{tagSecretScan}, nil, bearer_token, new(ScanTrigger), nil)

	d.AddOperation("startComplianceScan", http.MethodGet, "/deepfence/scan/start/compliances",
		"Start Compliance Scan", "Start Compliance Scan on agent",
		[]string{tagCompliance}, nil, bearer_token, new(ScanTrigger), nil)

}
