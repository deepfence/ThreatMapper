package ai_integration

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/ai-integration/openai"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/go-playground/validator/v10"
)

var (
	invalidIntegrationType = errors.New("invalid integration type")
)

func NewAiIntegration(ctx context.Context, integrationType string, apiKey string) (AiIntegration, error) {
	switch integrationType {
	case constants.OpenAI:
		return openai.New(ctx, apiKey)
	default:
		return nil, invalidIntegrationType
	}
}

func NewAiIntegrationFromDbEntry(ctx context.Context, integrationType string, config json.RawMessage) (AiIntegration, error) {
	switch integrationType {
	case constants.OpenAI:
		return openai.NewFromDbEntry(ctx, config)
	default:
		return nil, invalidIntegrationType
	}
}

// AiIntegration is the interface for all integrations
type AiIntegration interface {
	ValidateConfig(*validator.Validate) error
	GeneratePostureQuery(model.AiIntegrationRequest) (string, error)
	GenerateVulnerabilityQuery(model.AiIntegrationRequest) (string, error)
	Message(ctx context.Context, message string, dataChan chan []byte) error
	EncryptSecret(aes encryption.AES) error
	DecryptSecret(aes encryption.AES) error
}
