package generative_ai_integration //nolint:stylecheck

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/generative-ai-integration/bedrock"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/generative-ai-integration/openai"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/go-playground/validator/v10"
)

var ErrInvalidIntegrationType = errors.New("invalid integration type")

func NewGenerativeAiIntegration(ctx context.Context, req model.AddGenerativeAiIntegrationRequest) (GenerativeAiIntegration, error) {
	switch req.GetIntegrationType() {
	case constants.OpenAI:
		return openai.New(ctx, req.GetFields().(model.AddGenerativeAiOpenAIIntegration))
	case constants.Bedrock:
		return bedrock.New(ctx, req.GetFields().(model.AddGenerativeAiBedrockIntegration))
	default:
		return nil, ErrInvalidIntegrationType
	}
}

func NewGenerativeAiIntegrationFromDBEntry(ctx context.Context, integrationType string, config json.RawMessage) (GenerativeAiIntegration, error) {
	switch integrationType {
	case constants.OpenAI:
		return openai.NewFromDBEntry(ctx, config)
	case constants.Bedrock:
		return bedrock.NewFromDBEntry(ctx, config)
	default:
		return nil, ErrInvalidIntegrationType
	}
}

// GenerativeAiIntegration is the interface for all integrations
type GenerativeAiIntegration interface {
	ValidateConfig(*validator.Validate) error
	VerifyAuth(ctx context.Context) error
	GenerateCloudPostureQuery(model.GenerativeAiIntegrationRequest) (string, error)
	GenerateLinuxPostureQuery(model.GenerativeAiIntegrationRequest) (string, error)
	GenerateKubernetesPostureQuery(model.GenerativeAiIntegrationRequest) (string, error)
	GenerateVulnerabilityQuery(model.GenerativeAiIntegrationRequest) (string, error)
	GenerateSecretQuery(model.GenerativeAiIntegrationRequest) (string, error)
	GenerateMalwareQuery(model.GenerativeAiIntegrationRequest) (string, error)
	Message(ctx context.Context, message string, dataChan chan string) error
	EncryptSecret(aes encryption.AES) error
	DecryptSecret(aes encryption.AES) error
}
