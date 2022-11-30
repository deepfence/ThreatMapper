package apiDocs

import (
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/weaveworks/scope/report"
)

func (d *OpenApiDocs) AddUserAuthOperations() {
	d.AddOperation("registerUser", http.MethodPost, "/deepfence/user/register", "Register User", "First user registration. Further users needs to be invited.",
		[]string{tagAuthentication}, nil, nil, new(model.User), new(model.ResponseAccessToken))
}

func (d *OpenApiDocs) AddTopologyOperations() {
	d.AddOperation("getTopologyGraph", http.MethodGet, "/deepfence/topology-api/graph", "Get Topology Graph", "Retrieve the full topology graph associated with the account",
		[]string{tagTopology}, nil, nil, new(reporters.TopologyFilters), new(reporters.RenderedGraph))

	d.AddOperation("ingestAgentReport", http.MethodPost, "/deepfence/topology-api/ingest", "Ingest Topology Data", "Ingest data reported by one Agent",
		[]string{tagTopology}, nil, nil, new(report.Report), nil)
}

func (d *OpenApiDocs) AddThreatGraphOperations() {
	d.AddOperation("getThreatGraph", http.MethodGet, "/deepfence/threat/graph", "Get Threat Graph", "Retrieve the full threat graph associated with the account",
		[]string{tagTopology}, nil, nil, nil, new(reporters.ThreatGraph))
}

func (d *OpenApiDocs) AddIngestersOperations() {
	d.AddOperation("ingestCVEs", http.MethodGet, "/deepfence/df-api/cves", "Ingest CVEs", "Ingest CVEs found while scanning the agent",
		[]string{tagTopology}, nil, nil, new([]ingesters.DfCveStruct), nil)

	d.AddOperation("ingestSecrets", http.MethodGet, "/deepfence/df-api/secrets", "Ingest Secrets", "Ingest secrets found while scanning the agent",
		[]string{tagTopology}, nil, nil, new([]ingesters.Secret), nil)

	d.AddOperation("ingestCompliances", http.MethodGet, "/deepfence/df-api/compliance", "Ingest Compliances", "Ingest compliance issues found while scanning the agent",
		[]string{tagTopology}, nil, nil, new([]ingesters.ComplianceDoc), nil)

	d.AddOperation("ingestCloudCompliances", http.MethodGet, "/deepfence/df-api/cloud-compliance", "Ingest Cloud Compliances", "Ingest Cloud compliances found while scanning cloud provider",
		[]string{tagTopology}, nil, nil, new([]ingesters.CloudComplianceDoc), nil)

	d.AddOperation("ingestCloudResources", http.MethodGet, "/deepfence/df-api/cloud-resources", "Ingest Cloud resources", "Ingest Clouds Resources found while scanning cloud provider",
		[]string{tagTopology}, nil, nil, new([]ingesters.CloudResource), nil)

}
