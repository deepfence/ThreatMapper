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
	var openAiIntegration OpenAI
	err := json.Unmarshal(config, &openAiIntegration)
	if err != nil {
		return nil, err
	}
	return &openAiIntegration, nil
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

func (o *OpenAI) GenerateCloudPostureQuery(request model.AiIntegrationRequest) (string, error) {
	var query string
	if request.GetQueryType() == model.QueryTypeRemediation {
		req := request.GetFields().(model.AiIntegrationCloudPostureRequest)
		query = fmt.Sprintf(cloudPostureRemediationQuery, request.GetRemediationFormat(), req.CloudProvider, req.ComplianceCheckType, req.Title)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

func (o *OpenAI) GenerateLinuxPostureQuery(request model.AiIntegrationRequest) (string, error) {
	var query string
	if request.GetQueryType() == model.QueryTypeRemediation {
		req := request.GetFields().(model.AiIntegrationLinuxPostureRequest)
		query = fmt.Sprintf(linuxPostureRemediationQuery, request.GetRemediationFormat(), req.ComplianceCheckType, req.TestNumber, req.Description)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

func (o *OpenAI) GenerateKubernetesPostureQuery(request model.AiIntegrationRequest) (string, error) {
	var query string
	if request.GetQueryType() == model.QueryTypeRemediation {
		req := request.GetFields().(model.AiIntegrationKubernetesPostureRequest)
		query = fmt.Sprintf(kubernetesPostureRemediationQuery, request.GetRemediationFormat(), req.ComplianceCheckType, req.Description)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

func (o *OpenAI) GenerateVulnerabilityQuery(request model.AiIntegrationRequest) (string, error) {
	var query string
	if request.GetQueryType() == model.QueryTypeRemediation {
		req := request.GetFields().(model.AiIntegrationVulnerabilityRequest)
		packageName := ""
		if req.CveCausedByPackage != "" {
			packageName = "in package " + req.CveCausedByPackage
		}
		query = fmt.Sprintf(vulnerabilityRemediationQuery, request.GetRemediationFormat(), req.CveId, packageName)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

func (o *OpenAI) Message(ctx context.Context, message string, dataChan chan string) error {
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
			dataChan <- choice.Delta.Content
			if choice.FinishReason != "" {
				return nil
			}
		}
	}
	return nil
}
