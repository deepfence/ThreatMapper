package openai

import (
	"time"
)

const (
	messageRoleUser         = "user"
	defaultModel            = "gpt-4"
	defaultModelTemperature = 0.7

	httpRequestTimeout = 60 * time.Second

	openAiEndpoint = "https://api.openai.com"
	openAiChatURL  = openAiEndpoint + "/v1/chat/completions"

	cloudPostureRemediationQuery  = "%s remediation script for %s %s control %s"
	vulnerabilityRemediationQuery = "%s remediation script for vulnerability %s %s"
)

type OpenAI struct {
	ApiKey string `json:"api_key" validate:"required" required:"true"`
}

type OpenAIRequestMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIRequest struct {
	Model       string                 `json:"model"`
	Messages    []OpenAIRequestMessage `json:"messages"`
	Temperature float64                `json:"temperature"`
}

type OpenAIResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int    `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index int `json:"index"`
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
		FinishReason any `json:"finish_reason"`
	} `json:"choices"`
}
