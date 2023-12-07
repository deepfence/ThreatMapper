package bedrock

import (
	"encoding/json"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/bedrock"
	"github.com/aws/aws-sdk-go/service/bedrockruntime"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

func CheckBedrockModelAvailability() (bool, error) {
	foundModel := false
	for _, region := range BedrockRegions {
		sess, err := session.NewSession(&aws.Config{
			Region: aws.String(region),
		})
		if err != nil {
			return false, err
		}
		svc := bedrock.New(sess)

		models, err := svc.ListFoundationModels(&bedrock.ListFoundationModelsInput{
			ByOutputModality: &textModality,
		})
		if err != nil {
			return false, err
		}
		for _, modelSummary := range models.ModelSummaries {
			if *modelSummary.ModelLifecycle.Status == modelLifecycleActive {
				if _, ok := BedrockModelBody[*modelSummary.ModelId]; ok {
					foundModel = true
					break
				}
			}
		}
		if foundModel {
			break
		}
	}
	return foundModel, nil
}

// ListBedrockModels Fetch enabled Bedrock models using IAM roles
func ListBedrockModels(region string) ([]model.AddGenerativeAiIntegrationRequest, error) {
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(region),
	})
	if err != nil {
		return nil, err
	}

	svc := bedrock.New(sess)
	bedrockRuntimeSvc := bedrockruntime.New(sess)

	models, err := svc.ListFoundationModels(&bedrock.ListFoundationModelsInput{
		ByOutputModality: &textModality,
	})
	if err != nil {
		return nil, err
	}

	var bedrockModels []model.AddGenerativeAiIntegrationRequest
	message := "hello"

	for _, modelSummary := range models.ModelSummaries {
		if *modelSummary.ModelLifecycle.Status == modelLifecycleActive {
			if body, ok := BedrockModelBody[*modelSummary.ModelId]; ok {
				body[BedrockModelBodyInputKey[*modelSummary.ModelId]] = body[BedrockModelBodyInputKey[*modelSummary.ModelId]].(string) + message + BedrockModelBodyInputSuffix[*modelSummary.ModelId]
				bodyBytes, err := json.Marshal(body)
				if err != nil {
					log.Warn().Msg(err.Error())
					continue
				}
				_, err = bedrockRuntimeSvc.InvokeModel(&bedrockruntime.InvokeModelInput{
					Accept:      &acceptHeader,
					Body:        bodyBytes,
					ContentType: &contentTypeHeader,
					ModelId:     modelSummary.ModelId,
				})
				if err != nil {
					log.Warn().Msg(err.Error())
					continue
				}

				bedrockModels = append(bedrockModels, model.AddGenerativeAiBedrockIntegration{
					AWSRegion:  region,
					UseIAMRole: true,
					ModelID:    *modelSummary.ModelId,
				})
			}
		}
	}
	return bedrockModels, nil
}
