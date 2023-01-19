package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	commonConstants "github.com/deepfence/ThreatMapper/deepfence_server/constants/common"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
)

type RegistryAddReq struct {
	Name         string                 `json:"name"`
	NonSecret    map[string]interface{} `json:"non_secret"`
	Secret       map[string]interface{} `json:"secret"`
	RegistryType string                 `json:"registry_type"`
}

type DockerNonSecretField struct {
	DockerHubNamespace string `json:"docker_hub_namespace"`
	DockerHubUsername  string `json:"docker_hub_username"`
}

type DockerSecretField struct {
	DockerHubPassword string `json:"docker_hub_password"`
}

func (r *RegistryAddReq) RegistryExists(ctx context.Context, pgClient *postgresqlDb.Queries) (bool, error) {
	_, err := pgClient.GetContainerRegistryByTypeAndName(ctx, postgresqlDb.GetContainerRegistryByTypeAndNameParams{
		RegistryType: r.RegistryType,
		Name:         r.Name,
	})
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	} else if err != nil {
		return false, err
	}
	return true, nil
}

func (r *RegistryAddReq) GetAESValueForEncryption(ctx context.Context, pgClient *postgresqlDb.Queries) (json.RawMessage, error) {
	s := Setting{}
	aes, err := s.GetSettingByKey(ctx, pgClient, commonConstants.AES_SECRET)
	if err != nil {
		return nil, err
	}
	var sValue SettingValue
	err = json.Unmarshal(aes.Value, &sValue)
	if err != nil {
		return nil, err
	}

	b, err := json.Marshal(sValue.Value)
	if err != nil {
		return nil, err
	}

	return json.RawMessage(b), nil
}

func (r *RegistryAddReq) CreateRegistry(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	bSecret, err := json.Marshal(r.Secret)
	if err != nil {
		return err
	}
	// rawSecretJSON := json.RawMessage(string(bSecret))

	bNonSecret, err := json.Marshal(r.NonSecret)
	if err != nil {
		return err
	}
	// rawNonSecretJSON := json.RawMessage(string(bNonSecret))
	some := "{}"
	_, err = pgClient.CreateContainerRegistry(ctx, postgresqlDb.CreateContainerRegistryParams{
		Name:            r.Name,
		RegistryType:    r.RegistryType,
		EncryptedSecret: bSecret,      // rawSecretJSON,
		NonSecret:       bNonSecret,   //rawNonSecretJSON,
		Extras:          []byte(some), //json.RawMessage([]byte{}),
	})
	return err
}
