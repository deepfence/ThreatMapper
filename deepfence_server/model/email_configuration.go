package model

import (
	"context"
	"encoding/json"
	"github.com/deepfence/golang_deepfence_sdk/utils/encryption"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	postgresqlDb "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
)

type EmailConfigurationAdd struct {
	EmailProvider   string
	CreatedByUserID int64
	EmailID         string
	Smtp            string
	Port            string
	Password        string
	AmazonAccessKey string
	AmazonSecretKey string
	SesRegion       string
}

type EmailConfigurationResp struct {
	EmailProvider   string
	CreatedByUserID int64
	EmailID         string
	Smtp            string
	Port            string
	SesRegion       string
}

func (e *EmailConfigurationAdd) Create(ctx context.Context, pgClient *postgresqlDb.Queries) error {
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
		e.Password, err = aes.Encrypt(e.AmazonSecretKey)
		if err != nil {
			log.Error().Msgf(err.Error())
			return err
		}
	}
	return nil
}
