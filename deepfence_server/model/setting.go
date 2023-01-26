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
	ConsoleURLSettingKey = "console_url"
	JwtSecretSettingKey  = "jwt_secret"
)

type SettingValue struct {
	Label       string      `json:"label"`
	Value       interface{} `json:"value"`
	Description string      `json:"description"`
}

type Setting struct {
	ID            int64
	Key           string
	Value         *SettingValue
	IsVisibleOnUi bool
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

func ListSettings(ctx context.Context, pgClient *postgresqlDb.Queries, visible bool) ([]postgresqlDb.Setting, error) {
	var settings []postgresqlDb.Setting
	var err error
	if visible == true {
		settings, err = pgClient.GetVisibleSettings(ctx)
	} else {
		settings, err = pgClient.GetSettings(ctx)
	}
	if err != nil {
		return nil, err
	}
	return settings, nil
}

func GetManagementConsoleURL(ctx context.Context, pgClient *postgresqlDb.Queries) (string, error) {
	setting, err := pgClient.GetSetting(ctx, ConsoleURLSettingKey)
	if err != nil {
		return "", err
	}
	var settingVal SettingValue
	err = json.Unmarshal(setting.Value, &settingVal)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%v", settingVal.Value), nil
}

func GetSetting(ctx context.Context, pgClient *postgresqlDb.Queries, key string) (*postgresqlDb.Setting, error) {
	setting, err := pgClient.GetSetting(ctx, key)
	if err != nil {
		return nil, err
	}
	return &setting, nil
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
