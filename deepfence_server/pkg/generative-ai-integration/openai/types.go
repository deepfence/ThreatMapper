package openai

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/generative-ai-integration/common"
)

const (
	defaultModelTemperature = 0.7

	ModelGPT4 = "gpt-4"
)

type OpenAI struct {
	common.GenerativeAiIntegrationCommon
	APIKey  string `json:"api_key" validate:"required" required:"true"`
	ModelID string `json:"model_id" validate:"required,oneof=gpt-4" required:"true" enum:"gpt-4"`
}
