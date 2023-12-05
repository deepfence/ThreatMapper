package bedrock

import (
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/bedrock"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

// ListBedrockModels Fetch enabled Bedrock models using IAM roles
func ListBedrockModels(region string) ([]model.AddGenerativeAiIntegrationRequest, error) {
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(region),
	})
	if err != nil {
		return nil, err
	}
	svc := bedrock.New(sess)
	models, err := svc.ListFoundationModels(&bedrock.ListFoundationModelsInput{
		ByOutputModality: &textModality,
	})
	if err != nil {
		return nil, err
	}
	resp := []model.AddGenerativeAiIntegrationRequest{}
	for _, modelSummary := range models.ModelSummaries {
		if *modelSummary.ModelLifecycle.Status == modelLifecycleActive {
			if _, ok := BedrockModelBody[*modelSummary.ModelId]; ok {
				resp = append(resp, model.AddGenerativeAiBedrockIntegration{
					AWSRegion:  region,
					UseIAMRole: true,
					ModelID:    *modelSummary.ModelId,
				})
			}
		}
	}
	return resp, nil
}
