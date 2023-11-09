package openai

const (
	defaultModelTemperature = 0.7

	cloudPostureRemediationQuery      = "%s remediation script for %s %s control %s"
	linuxPostureRemediationQuery      = "%s remediation script for %s control %s %s"
	kubernetesPostureRemediationQuery = "%s remediation script for %s control %s"
	vulnerabilityRemediationQuery     = "%s remediation script for vulnerability %s %s"
)

type OpenAI struct {
	ApiKey string `json:"api_key" validate:"required" required:"true"`
}

type OpenAIRequestMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
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
