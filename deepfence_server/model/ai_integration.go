package model

import (
	"context"
	"database/sql"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
)

var (
	AIIntegrationTypeLabel = map[string]string{
		constants.OpenAI: "OpenAI",
	}
)

const (
	OpenAI = "openai"

	QueryTypeRemediation = "remediation"
	RemediationFormatAll = "all"
)

type AIIntegrationMessageResponse struct {
	Content      string `json:"content"`
	FinishReason string `json:"finish_reason"`
}

type AIIntegrationCloudPostureRequest struct {
	IntegrationType     string `json:"integration_type" validate:"omitempty,oneof=openai" enum:"openai"`
	QueryType           string `json:"query_type" validate:"required,oneof=remediation" required:"true" enum:"remediation"`
	RemediationFormat   string `json:"remediation_format" validate:"required,oneof=all cli pulumi terraform" required:"true" enum:"all,cli,pulumi,terraform"`
	Group               string `json:"group"`
	Service             string `json:"service"`
	Title               string `json:"title" validate:"required" required:"true"`
	ComplianceCheckType string `json:"compliance_check_type" validate:"required" required:"true"`
	CloudProvider       string `json:"cloud_provider" validate:"required" required:"true"`
}

type AIIntegrationVulnerabilityRequest struct {
	IntegrationType    string `json:"integration_type" validate:"omitempty,oneof=openai" enum:"openai"`
	QueryType          string `json:"query_type" validate:"required,oneof=remediation" required:"true" enum:"remediation"`
	RemediationFormat  string `json:"remediation_format" validate:"required,oneof=all cli pulumi terraform" required:"true" enum:"all,cli,pulumi,terraform"`
	CveId              string `json:"cve_id" validate:"required" required:"true"`
	CveType            string `json:"cve_type" validate:"required" required:"true"`
	CveCausedByPackage string `json:"cve_caused_by_package" validate:"required" required:"true"`
}

type AddAIIntegrationRequest struct {
	ApiKey          string `json:"api_key" validate:"required" required:"true"`
	IntegrationType string `json:"integration_type" validate:"required,oneof=openai" required:"true" enum:"openai"`
}

type AIIntegrationListResponse struct {
	ID                 int32  `json:"id"`
	IntegrationType    string `json:"integration_type"`
	Label              string `json:"label"`
	LastErrorMsg       string `json:"last_error_msg"`
	DefaultIntegration bool   `json:"default_integration"`
}

func (a *AddAIIntegrationRequest) IntegrationExists(ctx context.Context, pgClient *postgresqlDb.Queries) (bool, error) {
	_, err := pgClient.GetAIIntegrationFromType(ctx, a.IntegrationType)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
