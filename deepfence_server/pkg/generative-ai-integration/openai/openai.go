package openai

import (
	"context"
	"encoding/json"
	"io"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/go-playground/validator/v10"
	goopenai "github.com/sashabaranov/go-openai"
)

func New(ctx context.Context, req model.AddGenerativeAiOpenAIIntegration) (*OpenAI, error) {
	openAPI := OpenAI{APIKey: req.APIKey, ModelID: req.ModelID}
	return &openAPI, nil
}

func NewFromDBEntry(ctx context.Context, config json.RawMessage) (*OpenAI, error) {
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

func (o *OpenAI) VerifyAuth(ctx context.Context) error {
	client := goopenai.NewClient(o.APIKey)
	_, err := client.ListModels(ctx)
	return err
}

func (o *OpenAI) EncryptSecret(aes encryption.AES) error {
	var err error
	o.APIKey, err = aes.Encrypt(o.APIKey)
	return err
}

func (o *OpenAI) DecryptSecret(aes encryption.AES) error {
	var err error
	o.APIKey, err = aes.Decrypt(o.APIKey)
	return err
}

func (o *OpenAI) Message(ctx context.Context, message string, dataChan chan string) error {
	client := goopenai.NewClient(o.APIKey)
	req := goopenai.ChatCompletionRequest{
		Model:       o.ModelID,
		Messages:    []goopenai.ChatCompletionMessage{{Role: goopenai.ChatMessageRoleUser, Content: message}},
		Temperature: defaultModelTemperature,
		Stream:      true,
	}
	stream, err := client.CreateChatCompletionStream(ctx, req)
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
