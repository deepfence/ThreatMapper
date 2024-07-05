package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"reflect"

	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
)

type IntegrationIDPathReq struct {
	IntegrationID string `path:"integration_id" validate:"required" required:"true"`
}

type DeleteIntegrationReq struct {
	IntegrationIDs []int32 `json:"integration_ids" required:"true"`
}

// IntegrationAddReq is the request body for adding a new integration
type IntegrationAddReq struct {
	Config           map[string]interface{} `json:"config"`
	IntegrationType  string                 `json:"integration_type" required:"true"`
	NotificationType string                 `json:"notification_type" required:"true"`
	Filters          IntegrationFilters     `json:"filters"`
	SendSummary      bool                   `json:"send_summary"`
}

type IntegrationFilters struct {
	FieldsFilters  reporters.FieldsFilters `json:"fields_filters"`
	NodeIds        []NodeIdentifier        `json:"node_ids" required:"true"`
	ContainerNames []string                `json:"container_names" required:"false"`
}

func (i *IntegrationAddReq) IntegrationExists(ctx context.Context, pgClient *postgresqlDb.Queries) (bool, error) {

	ctx, span := telemetry.NewSpan(ctx, "model", "integration-exists")
	defer span.End()

	integrations, err := pgClient.GetIntegrationsFromType(ctx, i.IntegrationType)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}

	var config map[string]interface{}
	var found bool

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
	ctx, span := telemetry.NewSpan(ctx, "model", "create-integration")
	defer span.End()

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
	Filters          IntegrationFilters     `json:"filters"`
	LastErrorMsg     string                 `json:"last_error_msg"`
}

func (i *IntegrationListReq) GetIntegrations(ctx context.Context, pgClient *postgresqlDb.Queries) ([]postgresqlDb.Integration, error) {

	ctx, span := telemetry.NewSpan(ctx, "model", "get-integrations")
	defer span.End()

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
			i.Config[key+"_masked"] = redactLastHalfString(value.(string))
			delete(i.Config, key)
		}
	}
}

func redactLastHalfString(s string) string {
	if len(s) < 4 {
		return s
	}
	return s[:len(s)/2] + "****"
}

func DeleteIntegrations(ctx context.Context, pgClient *postgresqlDb.Queries, integrationIDs []int32) error {
	err := pgClient.DeleteIntegrations(ctx, integrationIDs)
	return err
}

type IntegrationUpdateReq struct {
	ID               int32                  `json:"id"`
	Config           map[string]interface{} `json:"config"`
	IntegrationType  string                 `json:"integration_type"`
	NotificationType string                 `json:"notification_type"`
	Filters          IntegrationFilters     `json:"filters"`
	IntegrationID    string                 `path:"integration_id" validate:"required" required:"true"`
	SendSummary      bool                   `json:"send_summary"`
}

func (i *IntegrationUpdateReq) UpdateIntegration(ctx context.Context, pgClient *postgresqlDb.Queries, integration postgresqlDb.Integration) error {

	ctx, span := telemetry.NewSpan(ctx, "model", "update-integration")
	defer span.End()

	bConfig, err := json.Marshal(i.Config)
	if err != nil {
		return err
	}

	bFilter, err := json.Marshal(i.Filters)
	if err != nil {
		return err
	}

	arg := postgresqlDb.UpdateIntegrationParams{
		ID:              i.ID,
		Resource:        i.NotificationType,
		IntegrationType: i.IntegrationType,
		IntervalMinutes: integration.IntervalMinutes,
		Config:          bConfig,
		Filters:         bFilter,
	}

	if i.Config != nil {
		arg.Config = bConfig
	}

	i.Config["filter_hash"] = i.Config["filter_hash"].(string)

	return pgClient.UpdateIntegration(ctx, arg)
}

func GetIntegration(ctx context.Context, pgClient *postgresqlDb.Queries, integrationID int32) (postgresqlDb.Integration, bool, error) {

	ctx, span := telemetry.NewSpan(ctx, "model", "get-integration")
	defer span.End()

	integration, err := pgClient.GetIntegrationFromID(ctx, integrationID)
	if err != nil {
		if err == sql.ErrNoRows {
			return postgresqlDb.Integration{}, false, nil
		}
		return postgresqlDb.Integration{}, false, err
	}
	return integration, true, nil
}
