package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"reflect"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	postgresqlDb "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
)

type IntegrationIDPathReq struct {
	IntegrationID string `path:"integration_id" validate:"required" required:"true"`
}

// IntegrationAddReq is the request body for adding a new integration
type IntegrationAddReq struct {
	Config           map[string]interface{}  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
}

func (i *IntegrationAddReq) IntegrationExists(ctx context.Context, pgClient *postgresqlDb.Queries) (bool, error) {
	integrations, err := pgClient.GetIntegrationsFromType(ctx, i.IntegrationType)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}

	var config map[string]interface{}
	var found = false

	for _, integration := range integrations {
		// json.rawmessage to map[string]interface{}
		err = json.Unmarshal(integration.Config, &config)
		if err != nil {
			return false, err
		}
		// compare the config
		found = reflect.DeepEqual(config, i.Config)
		if found && i.NotificationType == integration.Resource {
			return true, nil
		}
	}
	return false, nil
}

func (i *IntegrationAddReq) CreateIntegration(ctx context.Context, pgClient *postgresqlDb.Queries, userID int64) error {
	bConfig, err := json.Marshal(i.Config)
	if err != nil {
		return err
	}

	bFilter, err := json.Marshal(i.Filters)
	if err != nil {
		return err
	}

	arg := postgresqlDb.CreateIntegrationParams{
		Resource:        i.NotificationType,
		IntegrationType: i.IntegrationType,
		Config:          bConfig,
		Filters:         bFilter,
		CreatedByUserID: userID,
	}
	_, err = pgClient.CreateIntegration(ctx, arg)

	return err
}

type IntegrationListReq struct {
	IntegrationTypes []string `json:"integration_types"`
}

type IntegrationListResp struct {
	ID               int32                  `json:"id"`
	IntegrationType  string                 `json:"integration_type"`
	NotificationType string                 `json:"notification_type"`
	Config           map[string]interface{} `json:"config"`
	Filters          map[string]interface{} `json:"filters"`
}

func (i *IntegrationListReq) GetIntegrations(ctx context.Context, pgClient *postgresqlDb.Queries) ([]postgresqlDb.Integration, error) {
	var integrations []postgresqlDb.Integration

	if len(i.IntegrationTypes) == 0 {
		return pgClient.GetIntegrations(ctx)
	} else {
		for _, integrationType := range i.IntegrationTypes {
			integration, err := pgClient.GetIntegrationsFromType(ctx, integrationType)
			if err != nil {
				return nil, err
			}
			integrations = append(integrations, integration...)
		}
	}

	return integrations, nil
}

func (i *IntegrationListResp) RedactSensitiveFieldsInConfig() {
	for key, value := range i.Config {
		// if key is present in SensitiveFields map, redact the value
		if _, ok := constants.SensitiveFields[key]; ok {
			// redact last half of the string
			i.Config[key] = redactLastHalfString(value.(string))
		}
	}
}

func redactLastHalfString(s string) string {
	if len(s) < 4 {
		return s
	}
	return s[:len(s)/2] + "****"
}

func DeleteIntegration(ctx context.Context, pgClient *postgresqlDb.Queries, integrationID int32) error {
	err := pgClient.DeleteIntegration(ctx, integrationID)
	return err
}
