package model

import (
	"context"
	"database/sql"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
)

var (
	AiIntegrationTypeLabel = map[string]string{
		constants.OpenAI: "OpenAI",
	}
)

const (
	OpenAI = "openai"

	CloudPostureQuery  = "cloud_posture"
	VulnerabilityQuery = "vulnerability"

	QueryTypeRemediation = "remediation"
	RemediationFormatAll = "all"
)

type AiIntegrationMessageResponse struct {
	Content      string `json:"content"`
	FinishReason string `json:"finish_reason"`
}

type AiIntegrationRequest interface {
	GetRequestType() string
	GetFields() interface{}
	GetIntegrationType() string
	GetQueryType() string
	GetRemediationFormat() string
}

type AiIntegrationRequestCommon struct {
	IntegrationType   string `json:"integration_type" validate:"omitempty,oneof=openai" enum:"openai"`
	QueryType         string `json:"query_type" validate:"required,oneof=remediation" required:"true" enum:"remediation"`
	RemediationFormat string `json:"remediation_format" validate:"required,oneof=all cli pulumi terraform" required:"true" enum:"all,cli,pulumi,terraform"`
}

func (a AiIntegrationRequestCommon) GetIntegrationType() string {
	return a.IntegrationType
}

func (a AiIntegrationRequestCommon) GetQueryType() string {
	return a.QueryType
}

func (a AiIntegrationRequestCommon) GetRemediationFormat() string {
	return a.RemediationFormat
}

type AiIntegrationCloudPostureRequest struct {
	AiIntegrationRequestCommon
	Group               string `json:"group"`
	Service             string `json:"service"`
	Title               string `json:"title" validate:"required" required:"true"`
	ComplianceCheckType string `json:"compliance_check_type" validate:"required" required:"true"`
	CloudProvider       string `json:"cloud_provider" validate:"required" required:"true"`
}

func (a AiIntegrationCloudPostureRequest) GetFields() interface{} {
	return a
}

func (a AiIntegrationCloudPostureRequest) GetRequestType() string {
	return CloudPostureQuery
}

type AiIntegrationVulnerabilityRequest struct {
	AiIntegrationRequestCommon
	CveId              string `json:"cve_id" validate:"required" required:"true"`
	CveType            string `json:"cve_type" validate:"required" required:"true"`
	CveCausedByPackage string `json:"cve_caused_by_package" validate:"required" required:"true"`
}

func (a AiIntegrationVulnerabilityRequest) GetFields() interface{} {
	return a
}

func (a AiIntegrationVulnerabilityRequest) GetRequestType() string {
	return VulnerabilityQuery
}

type AddAiIntegrationRequest struct {
	ApiKey          string `json:"api_key" validate:"required" required:"true"`
	IntegrationType string `json:"integration_type" validate:"required,oneof=openai" required:"true" enum:"openai"`
}

type AiIntegrationListResponse struct {
	ID                 int32  `json:"id"`
	IntegrationType    string `json:"integration_type"`
	Label              string `json:"label"`
	LastErrorMsg       string `json:"last_error_msg"`
	DefaultIntegration bool   `json:"default_integration"`
}

func (a *AddAiIntegrationRequest) IntegrationExists(ctx context.Context, pgClient *postgresqlDb.Queries) (bool, error) {
	_, err := pgClient.GetAiIntegrationFromType(ctx, a.IntegrationType)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
