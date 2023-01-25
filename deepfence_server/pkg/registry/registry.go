package registry

import (
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/dockerhub"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
)

// todo: try interface in input not return
func GetRegistry(rType string, requestByte []byte) (Registry, error) {
	var r Registry
	err := errors.Errorf("registry type: %s, not supported", rType)
	// todo: move to constants
	if rType == "docker_hub" {
		r, err = dockerhub.New(requestByte)
	}
	return r, err
}

func GetRegistryWithRegistryRow(row postgresql_db.GetContainerRegistriesRow) (Registry, error) {
	var r Registry
	err := errors.Errorf("registry type: %s, not supported", row.RegistryType)
	// todo: move to constants
	if row.RegistryType == "docker_hub" {
		log.Info().Msg("inside if cond")
		var nonSecret map[string]string
		var secret map[string]string
		err := json.Unmarshal(row.NonSecret, &nonSecret)
		if err != nil {
			return nil, err
		}
		err = json.Unmarshal(row.EncryptedSecret, &secret)
		if err != nil {
			return nil, err
		}
		r = &dockerhub.RegistryDockerHub{
			RegistryType: row.RegistryType,
			Name:         row.Name,
			NonSecret: dockerhub.NonSecret{
				DockerHubNamespace: nonSecret["docker_hub_namespace"],
				DockerHubUsername:  nonSecret["docker_hub_username"],
			},
			Secret: dockerhub.Secret{
				DockerHubPassword: secret["docker_hub_password"],
			},
		}
		return r, nil
	}
	return r, err
}

// Registry is the interface for all the supported registries
type Registry interface {
	IsValidCredential() bool
	EncryptSecret(aes encryption.AES) error
	DecryptSecret(aes encryption.AES) error
	GetSecret() map[string]interface{}
	FetchImagesFromRegistry() ([]model.ImageAndTag, error)
	GetNamespace() string
	GetRegistryType() string
	GetUsername() string
}
