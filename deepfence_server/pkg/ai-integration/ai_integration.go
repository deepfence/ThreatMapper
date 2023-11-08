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

// AIIntegration is the interface for all integrations
type AIIntegration interface {
	ValidateConfig(*validator.Validate) error
	GeneratePostureQuery(model.AIIntegrationCloudPostureRequest) (string, error)
	GenerateVulnerabilityQuery(model.AIIntegrationVulnerabilityRequest) (string, error)
	Message(ctx context.Context, message string, dataChan chan []byte) error
	EncryptSecret(aes encryption.AES) error
	DecryptSecret(aes encryption.AES) error
}
