package model

import (
	"context"
	"database/sql"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
)

var (
	AIIntegrationTypeLabel = map[string]string{
		constants.OpenAI: "OpenAI",
	}
)

type AddAIIntegrationRequest struct {
	ApiKey          string `json:"api_key" validate:"required" required:"true"`
	IntegrationType string `json:"integration_type" validate:"required,oneof=openai" required:"true" enum:"openai"`
}

type AIIntegrationListResponse struct {
	ID                 int32  `json:"id"`
	IntegrationType    string `json:"integration_type"`
	Label              string `json:"label"`
	LastErrorMsg       string `json:"last_error_msg"`
	DefaultIntegration bool   `json:"default_integration"`
}

func (a *AddAIIntegrationRequest) IntegrationExists(ctx context.Context, pgClient *postgresqlDb.Queries) (bool, error) {
	_, err := pgClient.GetAIIntegrationFromType(ctx, a.IntegrationType)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
