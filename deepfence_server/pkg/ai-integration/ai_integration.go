package ai_integration

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/ai-integration/openai"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/go-playground/validator/v10"
)

var (
	invalidIntegrationType = errors.New("invalid integration type")
)

func NewIntegration(ctx context.Context, integrationType string, apiKey string) (AIIntegration, error) {
	switch integrationType {
	case constants.OpenAI:
		return openai.New(ctx, apiKey)
	default:
		return nil, invalidIntegrationType
	}
}

func NewIntegrationFromDbEntry(ctx context.Context, integrationType string, config json.RawMessage) (AIIntegration, error) {
	switch integrationType {
	case constants.OpenAI:
		return openai.NewFromDbEntry(ctx, config)
	default:
		return nil, invalidIntegrationType
	}
}

const (
	OpenAI = "openai"

	QueryTypeRemediation = "remediation"
	RemediationFormatAll = "all"
)

type AIIntegrationCloudPostureRequest struct {
	IntegrationType     string `json:"integration_type" validate:"omitempty,oneof=openai" enum:"openai"`
	QueryType           string `json:"query_type" validate:"required,oneof=remediation" required:"true" enum:"remediation"`
	RemediationFormat   string `json:"remediation_format" validate:"required,oneof=all,cli,pulumi,terraform" required:"true" enum:"all cli pulumi terraform"`
	Group               string `json:"group" validate:"required" required:"true"`
	Service             string `json:"service" validate:"required" required:"true"`
	Title               string `json:"title" validate:"required" required:"true"`
	ComplianceCheckType string `json:"compliance_check_type" validate:"required" required:"true"`
	CloudProvider       string `json:"cloud_provider" validate:"required" required:"true"`
	ControlID           string `json:"control_id" validate:"required" required:"true"`
}

type AIIntegrationVulnerabilityRequest struct {
	IntegrationType    string `json:"integration_type" validate:"omitempty,oneof=openai" enum:"openai"`
	QueryType          string `json:"query_type" validate:"required,oneof=remediation" required:"true" enum:"remediation"`
	RemediationFormat  string `json:"remediation_format" validate:"required,oneof=all,cli,pulumi,terraform" required:"true" enum:"all cli pulumi terraform"`
	CveId              string `json:"cve_id" validate:"required" required:"true"`
	CveType            string `json:"cve_type" validate:"required" required:"true"`
	CveCausedByPackage string `json:"cve_caused_by_package" validate:"required" required:"true"`
}

type AIIntegrationMessageResponse struct {
	Content      string `json:"content"`
	FinishReason string `json:"finish_reason"`
}

// AIIntegration is the interface for all integrations
type AIIntegration interface {
	ValidateConfig(*validator.Validate) error
	GeneratePostureQuery(AIIntegrationCloudPostureRequest) (string, error)
	GenerateVulnerabilityQuery(AIIntegrationVulnerabilityRequest) (string, error)
	Message(ctx context.Context, message string, dataChan chan []byte) error
	EncryptSecret(aes encryption.AES) error
	DecryptSecret(aes encryption.AES) error
}
