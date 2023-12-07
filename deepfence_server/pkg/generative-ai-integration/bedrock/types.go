package bedrock

import (
	"fmt"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/generative-ai-integration/common"
)

const (
	modelTemperature = 0.7

	ModelAnthorpicClaudeV2        = "anthropic.claude-v2"
	ModelAnthorpicClaudeInstantV1 = "anthropic.claude-instant-v1"
	ModelAmazonTitanTextLiteV1    = "amazon.titan-text-lite-v1"
	ModelAmazonTitanTextExpressV1 = "amazon.titan-text-express-v1"
	AI21LabsJurassic2UltraV1      = "ai21.j2-ultra-v1"
	AI21LabsJurassic2MidV1        = "ai21.j2-mid-v1"
	MetaLlama2Chat13BV1           = "meta.llama2-13b-chat-v1"
	CohereCommandTextV14          = "cohere.command-text-v14"
	CohereCommandLightTextV14     = "cohere.command-light-text-v14"

	modelLifecycleActive = "ACTIVE"
)

var (
	BedrockRegions = []string{"us-east-1", "us-west-2", "ap-southeast-1", "ap-northeast-1", "eu-central-1"}

	textModality = "TEXT"

	contentTypeHeader = "application/json"
	acceptHeader      = "*/*"

	ErrBedrockNoActiveModel error
)

func init() {
	supportedModels := ""
	for modelID := range BedrockModelBody {
		supportedModels += modelID + ", "
	}
	ErrBedrockNoActiveModel = fmt.Errorf("no active model, one of these should be active: %s", strings.Trim(supportedModels, ", "))
}

type Bedrock struct {
	common.GenerativeAiIntegrationCommon
	AWSAccessKey string `json:"aws_access_key" validate:"omitempty,min=16,max=128"`
	AWSSecretKey string `json:"aws_secret_key" validate:"omitempty,min=16,max=128"`
	AWSRegion    string `json:"aws_region" validate:"required,oneof=us-east-1 us-east-2 us-west-1 us-west-2 af-south-1 ap-east-1 ap-south-1 ap-northeast-1 ap-northeast-2 ap-northeast-3 ap-southeast-1 ap-southeast-2 ap-southeast-3 ca-central-1 eu-central-1 eu-west-1 eu-west-2 eu-west-3 eu-south-1 eu-north-1 me-south-1 me-central-1 sa-east-1 us-gov-east-1 us-gov-west-1" required:"true" enum:"us-east-1,us-east-2,us-west-1,us-west-2,af-south-1,ap-east-1,ap-south-1,ap-northeast-1,ap-northeast-2,ap-northeast-3,ap-southeast-1,ap-southeast-2,ap-southeast-3,ca-central-1,eu-central-1,eu-west-1,eu-west-2,eu-west-3,eu-south-1,eu-north-1,me-south-1,me-central-1,sa-east-1,us-gov-east-1,us-gov-west-1"`
	UseIAMRole   bool   `json:"use_iam_role"`
	ModelID      string `json:"model_id" validate:"required,oneof=anthropic.claude-v2 anthropic.claude-instant-v1 amazon.titan-text-lite-v1 amazon.titan-text-express-v1 ai21.j2-ultra-v1 ai21.j2-mid-v1 meta.llama2-13b-chat-v1 cohere.command-text-v14 cohere.command-light-text-v14" required:"true" enum:"anthropic.claude-v2,anthropic.claude-instant-v1,amazon.titan-text-lite-v1,amazon.titan-text-express-v1,ai21.j2-ultra-v1,ai21.j2-mid-v1,meta.llama2-13b-chat-v1,cohere.command-text-v14,cohere.command-light-text-v14"`
}

var (
	BedrockModelBody = map[string]map[string]interface{}{
		ModelAnthorpicClaudeV2: {
			"prompt":               "\n\nHuman: ",
			"max_tokens_to_sample": 300,
			"temperature":          modelTemperature,
			"top_k":                250,
			"top_p":                1,
			"stop_sequences":       []string{"\n\nHuman:"},
			"anthropic_version":    "bedrock-2023-05-31",
		},
		ModelAnthorpicClaudeInstantV1: {
			"prompt":               "\n\nHuman: ",
			"max_tokens_to_sample": 300,
			"temperature":          modelTemperature,
			"top_k":                250,
			"top_p":                1,
			"stop_sequences":       []string{"\n\nHuman:"},
			"anthropic_version":    "bedrock-2023-05-31",
		},
		ModelAmazonTitanTextLiteV1: {
			"inputText": "",
			"textGenerationConfig": map[string]interface{}{
				"maxTokenCount": 4096,
				"stopSequences": []string{},
				"temperature":   modelTemperature,
				"topP":          1,
			},
		},
		ModelAmazonTitanTextExpressV1: {
			"inputText": "",
			"textGenerationConfig": map[string]interface{}{
				"maxTokenCount": 8192,
				"stopSequences": []string{},
				"temperature":   modelTemperature,
				"topP":          1,
			},
		},
		AI21LabsJurassic2UltraV1: {
			"prompt":        "\n",
			"maxTokens":     200,
			"temperature":   modelTemperature,
			"topP":          1,
			"stopSequences": []string{},
			"countPenalty": map[string]int{
				"scale": 0,
			},
			"presencePenalty": map[string]int{
				"scale": 0,
			},
			"frequencyPenalty": map[string]int{
				"scale": 0,
			},
		},
		AI21LabsJurassic2MidV1: {
			"prompt":        "\n",
			"maxTokens":     200,
			"temperature":   modelTemperature,
			"topP":          1,
			"stopSequences": []string{},
			"countPenalty": map[string]int{
				"scale": 0,
			},
			"presencePenalty": map[string]int{
				"scale": 0,
			},
			"frequencyPenalty": map[string]int{
				"scale": 0,
			},
		},
		MetaLlama2Chat13BV1: {
			"prompt":      "",
			"max_gen_len": 2048,
			"temperature": modelTemperature,
			"top_p":       0.9,
		},
		CohereCommandTextV14: {
			"prompt":      "",
			"max_tokens":  200,
			"temperature": modelTemperature,
		},
		CohereCommandLightTextV14: {
			"prompt":      "",
			"max_tokens":  200,
			"temperature": modelTemperature,
		},
	}

	BedrockModelBodyInputKey = map[string]string{
		ModelAnthorpicClaudeV2:        "prompt",
		ModelAnthorpicClaudeInstantV1: "prompt",
		ModelAmazonTitanTextLiteV1:    "inputText",
		ModelAmazonTitanTextExpressV1: "inputText",
		AI21LabsJurassic2UltraV1:      "prompt",
		AI21LabsJurassic2MidV1:        "prompt",
		MetaLlama2Chat13BV1:           "prompt",
		CohereCommandTextV14:          "prompt",
		CohereCommandLightTextV14:     "prompt",
	}

	BedrockModelBodyInputSuffix = map[string]string{
		ModelAnthorpicClaudeV2:        "\n\nAssistant:",
		ModelAnthorpicClaudeInstantV1: "\n\nAssistant:",
		ModelAmazonTitanTextLiteV1:    "",
		ModelAmazonTitanTextExpressV1: "",
		AI21LabsJurassic2UltraV1:      "",
		AI21LabsJurassic2MidV1:        "",
		MetaLlama2Chat13BV1:           "",
		CohereCommandTextV14:          "",
		CohereCommandLightTextV14:     "",
	}
)

type BedrockResponse struct {
	Completion           string `json:"completion"`
	StopReason           string `json:"stop_reason"`
	Stop                 string `json:"stop"`
	Generation           string `json:"generation"`
	PromptTokenCount     int    `json:"prompt_token_count"`
	GenerationTokenCount int    `json:"generation_token_count"`
	Completions          []struct {
		Data struct {
			Text string `json:"text"`
		} `json:"data"`
		FinishReason struct {
			Reason string `json:"reason"`
		} `json:"finishReason"`
	} `json:"completions"`
	Generations []struct {
		FinishReason string `json:"finish_reason"`
		ID           string `json:"id"`
		Text         string `json:"text"`
	} `json:"generations"`
	Results []struct {
		TokenCount       int    `json:"tokenCount"`
		OutputText       string `json:"outputText"`
		CompletionReason string `json:"completionReason"`
	} `json:"results"`
}
