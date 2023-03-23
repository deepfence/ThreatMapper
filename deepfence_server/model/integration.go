package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"reflect"

	postgresqlDb "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
)

// IntegrationAddReq is the request body for adding a new integration
type IntegrationAddReq struct {
	Config           map[string]interface{} `json:"config"`
	IntegrationType  string                 `json:"integration_type"`
	NotificationType string                 `json:"notification_type"`
	Filters          map[string][]string    `json:"filters"`
}

func (i *IntegrationAddReq) IntegrationExists(ctx context.Context, pgClient *postgresqlDb.Queries) (bool, error) {
	integrations, err := pgClient.GetIntegrationFromType(ctx, i.IntegrationType)
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
		if found {
			return true, nil
		}
	}
	return false, nil
}

func (i *IntegrationAddReq) CreateIntegration(ctx context.Context, pgClient *postgresqlDb.Queries) error {
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
	}
	_, err = pgClient.CreateIntegration(ctx, arg)

	return err
}
