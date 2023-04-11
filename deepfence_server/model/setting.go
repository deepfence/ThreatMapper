package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	postgresqlDb "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

const (
	ConsoleURLSettingKey              = "console_url"
	JwtSecretSettingKey               = "jwt_secret"
	InactiveNodesDeleteScanResultsKey = "inactive_delete_scan_results"
)

type SettingValue struct {
	Label       string      `json:"label"`
	Value       interface{} `json:"value"`
	Description string      `json:"description"`
}

type Setting struct {
	ID            int64         `json:"id"`
	Key           string        `json:"key"`
	Value         *SettingValue `json:"value"`
	IsVisibleOnUi bool          `json:"is_visible_on_ui"`
}

type SettingsResponse struct {
	ID          int64       `json:"id" required:"true"`
	Key         string      `json:"key" required:"true"`
	Label       string      `json:"label" required:"true"`
	Value       interface{} `json:"value" required:"true"`
	Description string      `json:"description" required:"true"`
}

type SettingUpdateRequest struct {
	ID          int64       `json:"id" validate:"required" required:"true"`
	Key         string      `json:"key" validate:"required,oneof=console_url" required:"true" enum:"console_url"`
	Label       string      `json:"label" validate:"required,min=2,max=32" required:"true"`
	Value       interface{} `json:"value" validate:"required" required:"true"`
	Description string      `json:"description" validate:"required,min=2,max=64" required:"true"`
}

func (s *Setting) Create(ctx context.Context, pgClient *postgresqlDb.Queries) (*postgresqlDb.Setting, error) {
	settingVal, err := json.Marshal(s.Value)
	if err != nil {
		return nil, err
	}
	setting, err := pgClient.CreateSetting(ctx, postgresqlDb.CreateSettingParams{
		Key:           s.Key,
		Value:         settingVal,
		IsVisibleOnUi: s.IsVisibleOnUi,
	})
	if err != nil {
		return nil, err
	}
	return &setting, nil
}

func (s *Setting) Update(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	settingVal, err := json.Marshal(s.Value)
	if err != nil {
		return err
	}
	return pgClient.UpdateSettingById(ctx, postgresqlDb.UpdateSettingByIdParams{
		ID:            s.ID,
		Value:         settingVal,
		IsVisibleOnUi: s.IsVisibleOnUi,
	})
}

func GetVisibleSettings(ctx context.Context, pgClient *postgresqlDb.Queries) ([]SettingsResponse, error) {
	visibleSettings, err := pgClient.GetVisibleSettings(ctx)
	if err != nil {
		return nil, err
	}
	settings := make([]SettingsResponse, len(visibleSettings))
	for i, s := range visibleSettings {
		var sValue SettingValue
		err = json.Unmarshal(s.Value, &sValue)
		if err != nil {
			continue
		}
		settings[i] = SettingsResponse{
			ID:          s.ID,
			Key:         s.Key,
			Value:       sValue.Value,
			Label:       sValue.Label,
			Description: sValue.Description,
		}
	}
	return settings, nil
}

func GetSettingByKey(ctx context.Context, pgClient *postgresqlDb.Queries, key string) (postgresqlDb.Setting, error) {
	setting, err := pgClient.GetSetting(ctx, key)
	if err != nil {
		return postgresqlDb.Setting{}, err
	}
	return setting, nil
}

func GetJwtSecretSetting(ctx context.Context, pgClient *postgresqlDb.Queries) ([]byte, error) {
	setting, err := pgClient.GetSetting(ctx, JwtSecretSettingKey)
	if errors.Is(err, sql.ErrNoRows) {
		s := Setting{
			Key: JwtSecretSettingKey,
			Value: &SettingValue{
				Label:       "JWT Secret",
				Value:       utils.NewUUIDString(),
				Description: "Used for encrypting JWT",
			},
			IsVisibleOnUi: false,
		}
		_, err := s.Create(ctx, pgClient)
		if err != nil {
			return nil, err
		}
		return []byte(fmt.Sprintf("%v", s.Value.Value)), nil
	} else if err != nil {
		return nil, err
	}
	var sVal *SettingValue
	err = json.Unmarshal(setting.Value, &sVal)
	if err != nil {
		return nil, err
	}
	return []byte(fmt.Sprintf("%v", sVal.Value)), nil
}

func SetScanResultsDeletionSetting(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	_, err := pgClient.GetSetting(ctx, InactiveNodesDeleteScanResultsKey)
	if errors.Is(err, sql.ErrNoRows) {
		s := Setting{
			Key: InactiveNodesDeleteScanResultsKey,
			Value: &SettingValue{
				Label:       "Inactive Nodes Scan Results Deletion Interval",
				Value:       30, // 30 days
				Description: "Scan results deletion interval (in days) for nodes that are not active",
			},
			IsVisibleOnUi: true,
		}
		_, err = s.Create(ctx, pgClient)
		if err != nil {
			return err
		}
		return nil
	} else if err != nil {
		return err
	}
	return nil
}
