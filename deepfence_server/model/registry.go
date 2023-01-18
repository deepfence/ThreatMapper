package model

import (
	"context"
	"encoding/json"
	"reflect"

	commonConstants "github.com/deepfence/ThreatMapper/deepfence_server/constants/common"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
)

type RegistryAddReq struct {
	Name         string `json:"name"`
	NonSecret    map[string]interface{}
	Secret       map[string]interface{}
	RegistryType string `json:"registry_type"`
}

type DockerNonSecretField struct {
	DockerHubNamespace string `json:"docker_hub_namespace"`
	DockerHubUsername  string `json:"docker_hub_username"`
}

type DockerSecretField struct {
	DockerHubPassword string `json:"docker_hub_password"`
}

func (r *RegistryAddReq) RegistryExists(ctx context.Context, pgClient *postgresqlDb.Queries) (bool, error) {
	// pgClient, err := directory.PostgresClient(ctx)
	registry, err := pgClient.GetContainerRegistryByTypeAndName(ctx, postgresqlDb.GetContainerRegistryByTypeAndNameParams{r.RegistryType, r.Name})
	if err != nil {
		return false, err
	}
	// check if empty
	if reflect.DeepEqual(postgresqlDb.GetContainerRegistryByTypeAndNameParams{}, registry) {
		return false, nil
	}

	return true, nil
}

func (r *RegistryAddReq) GetAESValueForEncryption(ctx context.Context, pgClient *postgresqlDb.Queries) (json.RawMessage, error) {
	s := Setting{}
	aes, err := s.GetSettingByKey(ctx, pgClient, commonConstants.AES_SECRET)
	if err != nil {
		return nil, err
	}
	return aes.Value, nil
}

func (r *RegistryAddReq) CreateRegistry(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	b, err := json.Marshal(r.Secret)
	if err != nil {
		return err
	}
	rawSecretJSON := json.RawMessage(b)
	_, err = pgClient.CreateContainerRegistry(ctx, postgresqlDb.CreateContainerRegistryParams{
		Name:            r.Name,
		RegistryType:    r.RegistryType,
		EncryptedSecret: rawSecretJSON,
	})
	return err
}
