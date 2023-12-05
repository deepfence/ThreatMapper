package bedrock

import (
	"context"
	"encoding/json"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/bedrockruntime"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/go-playground/validator/v10"
)

func New(ctx context.Context, req model.AddGenerativeAiBedrockIntegration) (*Bedrock, error) {
	bedrockIntegration := Bedrock{
		AWSAccessKey: req.AWSAccessKey,
		AWSSecretKey: req.AWSSecretKey,
		AWSRegion:    req.AWSRegion,
		UseIAMRole:   req.UseIAMRole,
		ModelID:      req.ModelID,
	}
	return &bedrockIntegration, nil
}

func NewFromDBEntry(ctx context.Context, config json.RawMessage) (*Bedrock, error) {
	var bedrockIntegration Bedrock
	err := json.Unmarshal(config, &bedrockIntegration)
	if err != nil {
		return nil, err
	}
	return &bedrockIntegration, nil
}

func (b *Bedrock) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(b)
}

func (b *Bedrock) VerifyAuth(ctx context.Context) error {
	var err error
	if b.UseIAMRole {
		_, err = session.NewSession(&aws.Config{
			Region: aws.String(b.AWSRegion),
		})
	} else {
		_, err = session.NewSession(&aws.Config{
			Region:      aws.String(b.AWSRegion),
			Credentials: credentials.NewStaticCredentials(b.AWSAccessKey, b.AWSSecretKey, ""),
		})
	}
	if err != nil {
		return err
	}
	return nil
}

func (b *Bedrock) EncryptSecret(aes encryption.AES) error {
	var err error
	b.AWSSecretKey, err = aes.Encrypt(b.AWSSecretKey)
	return err
}

func (b *Bedrock) DecryptSecret(aes encryption.AES) error {
	var err error
	b.AWSSecretKey, err = aes.Decrypt(b.AWSSecretKey)
	return err
}

func (b *Bedrock) Message(ctx context.Context, message string, dataChan chan string) error {
	var sess *session.Session
	var err error
	if b.UseIAMRole {
		sess, err = session.NewSession(&aws.Config{
			Region: aws.String(b.AWSRegion),
		})
	} else {
		sess, err = session.NewSession(&aws.Config{
			Region:      aws.String(b.AWSRegion),
			Credentials: credentials.NewStaticCredentials(b.AWSAccessKey, b.AWSSecretKey, ""),
		})
	}
	if err != nil {
		return err
	}

	svc := bedrockruntime.New(sess)
	body := BedrockModelBody[b.ModelID]
	body[BedrockModelBodyInputKey[b.ModelID]] = body[BedrockModelBodyInputKey[b.ModelID]].(string) + message + BedrockModelBodyInputSuffix[b.ModelID]
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return err
	}
	resp, err := svc.InvokeModel(&bedrockruntime.InvokeModelInput{
		Accept:      &acceptHeader,
		Body:        bodyBytes,
		ContentType: &contentTypeHeader,
		ModelId:     &b.ModelID,
	})
	if err != nil {
		return err
	}

	var modelResponse BedrockResponse
	err = json.Unmarshal(resp.Body, &modelResponse)
	if err != nil {
		return err
	}

	switch b.ModelID {
	case ModelAnthorpicClaudeV2, ModelAnthorpicClaudeInstantV1:
		dataChan <- modelResponse.Completion
	case ModelAmazonTitanTextLiteV1, ModelAmazonTitanTextExpressV1:
		for _, result := range modelResponse.Results {
			dataChan <- result.OutputText
		}
	case AI21LabsJurassic2UltraV1, AI21LabsJurassic2MidV1:
		for _, completion := range modelResponse.Completions {
			dataChan <- completion.Data.Text
		}
	case MetaLlama2Chat13BV1:
		dataChan <- modelResponse.Generation
	case CohereCommandTextV14, CohereCommandLightTextV14:
		for _, generation := range modelResponse.Generations {
			dataChan <- generation.Text
		}
	}

	return nil
}
