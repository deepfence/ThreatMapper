package registry

import (
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/dockerhub"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/quay"
	"github.com/deepfence/golang_deepfence_sdk/utils/encryption"
	postgresql_db "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	"github.com/pkg/errors"
)

// todo: try interface in input not return
func GetRegistry(rType string, requestByte []byte) (Registry, error) {
	var r Registry
	err := errors.Errorf("registry type: %s, not supported", rType)

	switch rType {
	case DOCKER_HUB:
		r, err = dockerhub.New(requestByte)
	case QUAY:
		r, err = quay.New(requestByte)
	}
	return r, err
}

func GetRegistryWithRegistryRow(row postgresql_db.GetContainerRegistriesRow) (Registry, error) {
	var r Registry
	err := errors.Errorf("registry type: %s, not supported", row.RegistryType)

	switch row.RegistryType {
	case DOCKER_HUB:
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
	case QUAY:
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
		r = &quay.RegistryQuay{
			RegistryType: row.RegistryType,
			Name:         row.Name,
			NonSecret: quay.NonSecret{
				QuayNamespace:   nonSecret["quay_namespace"],
				QuayRegistryURL: nonSecret["quay_registry_url"],
			},
			Secret: quay.Secret{
				QuayAccessToken: secret["quay_access_token"],
			},
		}
		return r, nil
	}
	return r, err
}

func GetRegistryWithRegistrySafeRow(row postgresql_db.GetContainerRegistriesSafeRow) (Registry, error) {
	var r Registry
	err := errors.Errorf("registry type: %s, not supported", row.RegistryType)

	switch row.RegistryType {
	case DOCKER_HUB:
		var nonSecret map[string]string
		var secret map[string]string
		err := json.Unmarshal(row.NonSecret, &nonSecret)
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
	case QUAY:
		var nonSecret map[string]string
		var secret map[string]string
		err := json.Unmarshal(row.NonSecret, &nonSecret)
		if err != nil {
			return nil, err
		}
		r = &quay.RegistryQuay{
			RegistryType: row.RegistryType,
			Name:         row.Name,
			NonSecret: quay.NonSecret{
				QuayNamespace:   nonSecret["quay_namespace"],
				QuayRegistryURL: nonSecret["quay_registry_url"],
			},
			Secret: quay.Secret{
				QuayAccessToken: secret["quay_access_token"],
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
	FetchImagesFromRegistry() ([]model.ContainerImage, error)
	GetNamespace() string
	GetRegistryType() string
	GetUsername() string
}
