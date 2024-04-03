package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
)

type EmailConfigurationSMTP struct {
	EmailID  string `json:"email_id" validate:"required,email"`
	SMTP     string `json:"smtp" validate:"required,min=3,max=128"`
	Port     string `json:"port" validate:"required,min=1,max=5,number"`
	Password string `json:"password" validate:"required,min=3,max=128"`
}

type EmailConfigurationSES struct {
	EmailID         string `json:"email_id" validate:"required,email"`
	AmazonAccessKey string `json:"amazon_access_key" validate:"required,min=16,max=128"`
	AmazonSecretKey string `json:"amazon_secret_key" validate:"required,min=16,max=128"`
	SesRegion       string `json:"ses_region" validate:"required,oneof=us-east-1 us-east-2 us-west-1 us-west-2 af-south-1 ap-east-1 ap-south-1 ap-northeast-1 ap-northeast-2 ap-northeast-3 ap-southeast-1 ap-southeast-2 ap-southeast-3 ca-central-1 eu-central-1 eu-west-1 eu-west-2 eu-west-3 eu-south-1 eu-north-1 me-south-1 me-central-1 sa-east-1 us-gov-east-1 us-gov-west-1"`
}

type EmailConfigurationSendGrid struct {
	EmailID string `json:"email_id" validate:"required,email"`
	APIKey  string `json:"apikey" validate:"required,min=3,max=128"`
}

type EmailConfigurationAdd struct {
	EmailProvider   string `json:"email_provider"`
	CreatedByUserID int64  `json:"created_by_user_id"`
	EmailID         string `json:"email_id"`
	SMTP            string `json:"smtp"`
	Port            string `json:"port"`
	Password        string `json:"password"`
	AmazonAccessKey string `json:"amazon_access_key"`
	AmazonSecretKey string `json:"amazon_secret_key"`
	SesRegion       string `json:"ses_region"`
	APIKey          string `json:"apikey"`
}

type EmailConfigurationResp struct {
	ID              int64  `json:"id"`
	EmailProvider   string `json:"email_provider"`
	CreatedByUserID int64  `json:"created_by_user_id"`
	EmailID         string `json:"email_id"`
	SMTP            string `json:"smtp"`
	Port            string `json:"port"`
	SesRegion       string `json:"ses_region"`
}

type ConfigIDPathReq struct {
	ConfigID string `path:"config_id" validate:"required" required:"true"`
}

func (e *EmailConfigurationAdd) Create(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	_, err := pgClient.GetSetting(ctx, EmailConfigurationKey)
	switch {
	case errors.Is(err, sql.ErrNoRows):
		// valid case
	case err != nil:
		log.Error().Msgf(err.Error())
		return err
	default:
		return errors.New("email Configuration already exists")
	}

	aesValue, err := GetAESValueForEncryption(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}

	// note: we'll encrypt the secret in registry interface object and use its secretgetter
	// to map the secrets with req
	aes := encryption.AES{}
	err = json.Unmarshal(aesValue, &aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}
	if e.Password != "" {
		e.Password, err = aes.Encrypt(e.Password)
		if err != nil {
			log.Error().Msgf(err.Error())
			return err
		}
	}
	if e.AmazonAccessKey != "" {
		e.AmazonAccessKey, err = aes.Encrypt(e.AmazonAccessKey)
		if err != nil {
			log.Error().Msgf(err.Error())
			return err
		}
	}
	if e.AmazonSecretKey != "" {
		e.AmazonSecretKey, err = aes.Encrypt(e.AmazonSecretKey)
		if err != nil {
			log.Error().Msgf(err.Error())
			return err
		}
	}
	if e.APIKey != "" {
		e.APIKey, err = aes.Encrypt(e.APIKey)
		if err != nil {
			log.Error().Msgf(err.Error())
			return err
		}
	}
	settingVal, err := json.Marshal(*e)
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}
	_, err = pgClient.CreateSetting(ctx, postgresqlDb.CreateSettingParams{
		Key:           EmailConfigurationKey,
		Value:         settingVal,
		IsVisibleOnUi: false,
	})
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}
	return nil
}
