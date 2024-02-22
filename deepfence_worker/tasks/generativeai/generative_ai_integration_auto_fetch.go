package generativeai

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	generative_ai_integration "github.com/deepfence/ThreatMapper/deepfence_server/pkg/generative-ai-integration"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/generative-ai-integration/bedrock"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
)

var (
	ErrBedrockNoModels               = errors.New("could not automatically fetch Amazon Bedrock integrations, no active models found")
	ErrGenerativeAIIntegrationExists = errors.New("similar integration already exists")
)

func AutoFetchGenerativeAIIntegrations(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	var params utils.AutoFetchGenerativeAIIntegrationsParameters

	log.Info().Msgf("AutoFetchGenerativeAIIntegrations, payload: %s ", string(task.Payload()))

	if err := json.Unmarshal(task.Payload(), &params); err != nil {
		log.Error().Msgf("AutoFetchGenerativeAIIntegrations, error in Unmarshal: %s", err.Error())
		return nil
	}

	var err error
	switch params.CloudProvider {
	case "aws":
		err = AutoFetchBedrockIntegrations(ctx, params)
	}
	if err != nil {
		log.Error().Msg(err.Error())
	}
	return nil
}

func AutoFetchBedrockIntegrations(ctx context.Context, params utils.AutoFetchGenerativeAIIntegrationsParameters) error {

	log := log.WithCtx(ctx)

	var foundRegion string
	var err error
	var models []model.AddGenerativeAiIntegrationRequest
	for _, region := range bedrock.BedrockRegions {
		models, err = bedrock.ListBedrockModels(region)
		if err != nil {
			log.Warn().Msg(err.Error())
			continue
		}
		if len(models) == 0 {
			continue
		}
		foundRegion = region
		break
	}
	if foundRegion == "" {
		return ErrBedrockNoModels
	}

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}
	// encrypt secret
	aesValue, err := model.GetAESValueForEncryption(ctx, pgClient)
	if err != nil {
		return err
	}
	aes := encryption.AES{}
	err = json.Unmarshal(aesValue, &aes)
	if err != nil {
		return err
	}

	for _, req := range models {
		err = CreateGenerativeAIModel(ctx, req, aes, params.UserID, pgClient)
		if err != nil {
			log.Warn().Msg(err.Error())
			continue
		}
	}

	return nil
}

func CreateGenerativeAIModel(ctx context.Context, req model.AddGenerativeAiIntegrationRequest, aes encryption.AES, userID int64, pgClient *postgresqlDb.Queries) error {

	log := log.WithCtx(ctx)

	obj, err := generative_ai_integration.NewGenerativeAiIntegration(ctx, req)
	if err != nil {
		return err
	}

	err = obj.EncryptSecret(aes)
	if err != nil {
		return err
	}

	// add integration to database
	// before that check if integration already exists
	integrationExists, err := req.IntegrationExists(ctx, pgClient)
	if err != nil {
		return err
	}
	if integrationExists {
		return ErrGenerativeAIIntegrationExists
	}

	// store the integration in db
	bConfig, err := json.Marshal(obj)
	if err != nil {
		return err
	}

	arg := postgresqlDb.CreateGenerativeAiIntegrationParams{
		IntegrationType: req.GetIntegrationType(),
		Label:           req.GetLabel(),
		Config:          bConfig,
		CreatedByUserID: userID,
	}
	dbIntegration, err := pgClient.CreateGenerativeAiIntegration(ctx, arg)
	if err != nil {
		return err
	}

	err = pgClient.UpdateGenerativeAiIntegrationDefault(ctx, dbIntegration.ID)
	if err != nil {
		log.Warn().Msgf(err.Error())
	}
	return nil
}
