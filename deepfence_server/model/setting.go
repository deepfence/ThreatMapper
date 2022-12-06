package model

import (
	"context"
	"encoding/json"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
)

const (
	ConsoleURLSettingKey = "console_url"
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
