package notification

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

// GetIntegrationFailures returns the integrations that have failed
func GetIntegrationFailures(ctx context.Context) ([]model.IntegrationListResp, error) {
	var failedIntegrations []model.IntegrationListResp
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return failedIntegrations, nil
	}

	integrations, err := pgClient.GetIntegrations(ctx)
	if err != nil {
		log.Error().Msgf("Error getting postgresCtx: %v", err)
		return failedIntegrations, err
	}

	// filter out integrations that have errorMsg
	for _, integration := range integrations {
		if integration.ErrorMsg.Valid {
			var config map[string]interface{}
			var filters model.IntegrationFilters

			err = json.Unmarshal(integration.Config, &config)
			if err != nil {
				log.Error().Msgf(err.Error())
				continue
			}
			err = json.Unmarshal(integration.Filters, &filters)
			if err != nil {
				log.Error().Msgf(err.Error())
				continue
			}

			var integrationStatus string
			if integration.ErrorMsg.Valid {
				integrationStatus = integration.ErrorMsg.String
			}

			var lastSentTime string
			if integration.LastSentTime.Valid {
				lastSentTime = integration.LastSentTime.Time.String()
			}

			newIntegration := model.IntegrationListResp{
				ID:               integration.ID,
				IntegrationType:  integration.IntegrationType,
				NotificationType: integration.Resource,
				Config:           config,
				Filters:          filters,
				LastErrorMsg:     integrationStatus,
				LastSentTime:     lastSentTime,
			}

			newIntegration.RedactSensitiveFieldsInConfig()
			failedIntegrations = append(failedIntegrations, newIntegration)
		}
	}

	return failedIntegrations, nil
}
