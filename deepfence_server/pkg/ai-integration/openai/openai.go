package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	ai_integration "github.com/deepfence/ThreatMapper/deepfence_server/pkg/ai-integration"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-playground/validator/v10"
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

func (o *OpenAI) GeneratePostureQuery(request ai_integration.AIIntegrationCloudPostureRequest) (string, error) {
	var query string
	if request.QueryType == ai_integration.QueryTypeRemediation {
		remediationFormat := ""
		if request.RemediationFormat != ai_integration.RemediationFormatAll {
			remediationFormat = request.RemediationFormat
		}
		query = fmt.Sprintf(cloudPostureRemediationQuery, remediationFormat, request.CloudProvider, request.ComplianceCheckType, request.Title)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

func (o *OpenAI) GenerateVulnerabilityQuery(request ai_integration.AIIntegrationVulnerabilityRequest) (string, error) {
	var query string
	if request.QueryType == ai_integration.QueryTypeRemediation {
		remediationFormat := ""
		if request.RemediationFormat != ai_integration.RemediationFormatAll {
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
	openAIReq := OpenAIRequest{
		Model:       defaultModel,
		Messages:    []OpenAIRequestMessage{{Role: messageRoleUser, Content: message}},
		Temperature: defaultModelTemperature,
	}
	openAIReqJson, err := json.Marshal(openAIReq)
	if err != nil {
		return err
	}
	req, err := http.NewRequest("POST", openAiChatURL, bytes.NewBuffer(openAIReqJson))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+o.ApiKey)
	req.Header.Set("Connection", "keep-alive")

	client := utils.GetHttpClientWithTimeout(httpRequestTimeout)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	for {
		data := make([]byte, 2048)
		_, err = resp.Body.Read(data)
		if err != nil {
			log.Warn().Msg(err.Error())
			break
		}
		data = bytes.Trim(data, "\x00")
		dataLines := strings.Split(string(data), "\n")
		for _, line := range dataLines {
			if line == "" {
				continue
			}
			line = strings.TrimPrefix(line, "data: ")
			var openAiResp OpenAIResponse
			err = json.Unmarshal([]byte(line), &openAiResp)
			if err != nil {
				log.Warn().Msg(err.Error())
				return nil
			}
			for _, choice := range openAiResp.Choices {
				response := ai_integration.AIIntegrationMessageResponse{Content: choice.Delta.Content}
				if choice.FinishReason != nil {
					response.FinishReason = fmt.Sprintf("%v", choice.FinishReason)
				}
				responseJson, err := json.Marshal(response)
				if err != nil {
					log.Warn().Msg(err.Error())
					return nil
				}
				dataChan <- responseJson
				if choice.FinishReason != nil {
					return nil
				}
			}
		}
	}

	return nil
}
