package openai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/go-playground/validator/v10"
	goopenai "github.com/sashabaranov/go-openai"
)

func New(ctx context.Context, apiKey string) (*OpenAI, error) {
	openApi := OpenAI{ApiKey: apiKey}
	return &openApi, nil
}

func NewFromDbEntry(ctx context.Context, config json.RawMessage) (*OpenAI, error) {
	var openAIIntegration OpenAI
	err := json.Unmarshal(config, &openAIIntegration)
	if err != nil {
		return nil, err
	}
	return &openAIIntegration, nil
}

func (o *OpenAI) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(o)
}

func (o *OpenAI) EncryptSecret(aes encryption.AES) error {
	var err error
	o.ApiKey, err = aes.Encrypt(o.ApiKey)
	return err
}

func (o *OpenAI) DecryptSecret(aes encryption.AES) error {
	var err error
	o.ApiKey, err = aes.Decrypt(o.ApiKey)
	return err
}

func (o *OpenAI) GeneratePostureQuery(request model.AIIntegrationCloudPostureRequest) (string, error) {
	var query string
	if request.QueryType == model.QueryTypeRemediation {
		remediationFormat := ""
		if request.RemediationFormat != model.RemediationFormatAll {
			remediationFormat = request.RemediationFormat
		}
		query = fmt.Sprintf(cloudPostureRemediationQuery, remediationFormat, request.CloudProvider, request.ComplianceCheckType, request.Title)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

func (o *OpenAI) GenerateVulnerabilityQuery(request model.AIIntegrationVulnerabilityRequest) (string, error) {
	var query string
	if request.QueryType == model.QueryTypeRemediation {
		remediationFormat := ""
		if request.RemediationFormat != model.RemediationFormatAll {
			remediationFormat = request.RemediationFormat
		}
		packageName := ""
		if request.CveCausedByPackage != "" {
			packageName = "in package " + request.CveCausedByPackage
		}
		query = fmt.Sprintf(vulnerabilityRemediationQuery, remediationFormat, request.CveId, packageName)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

func (o *OpenAI) Message(ctx context.Context, message string, dataChan chan []byte) error {
	client := goopenai.NewClient(o.ApiKey)
	req := goopenai.ChatCompletionRequest{
		Model:       goopenai.GPT4,
		Messages:    []goopenai.ChatCompletionMessage{{Role: goopenai.ChatMessageRoleUser, Content: message}},
		Temperature: defaultModelTemperature,
		Stream:      true,
	}
	stream, err := client.CreateChatCompletionStream(context.Background(), req)
	if err != nil {
		log.Warn().Msg(err.Error())
		return err
	}
	for {
		receivedResponse, streamErr := stream.Recv()
		if streamErr != nil {
			if streamErr != io.EOF {
				log.Warn().Msg(streamErr.Error())
			}
			break
		}
		for _, choice := range receivedResponse.Choices {
			dataChan <- []byte(choice.Delta.Content)
			if choice.FinishReason != "" {
				break
			}
		}
	}
	return nil
}
