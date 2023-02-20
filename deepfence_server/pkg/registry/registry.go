package registry

import (
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/dockerhub"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/gcr"
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
	case constants.DOCKER_HUB:
		r, err = dockerhub.New(requestByte)
	case constants.QUAY:
		r, err = quay.New(requestByte)
	case constants.GCR:
		r, err = gcr.New(requestByte)
	}
	return r, err
}

func GetRegistryWithRegistryRow(row postgresql_db.GetContainerRegistriesRow) (Registry, error) {
	var r Registry
	err := errors.Errorf("registry type: %s, not supported", row.RegistryType)

	switch row.RegistryType {
	case constants.DOCKER_HUB:
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
	case constants.QUAY:
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
	case constants.GCR:
		var nonSecret map[string]string
		var secret map[string]string
		var extras map[string]string
		err := json.Unmarshal(row.NonSecret, &nonSecret)
		if err != nil {
			return nil, err
		}
		err = json.Unmarshal(row.EncryptedSecret, &secret)
		if err != nil {
			return nil, err
		}
		err = json.Unmarshal(row.Extras, &extras)
		if err != nil {
			return nil, err
		}
		r = &gcr.RegistryGCR{
			RegistryType: row.RegistryType,
			Name:         row.Name,
			NonSecret: gcr.NonSecret{
				RegistryURL: nonSecret["registry_url"],
				ProjectId:   nonSecret["project_id"],
			},
			Secret: gcr.Secret{
				ProjectId:    secret["project_id"],
				PrivateKeyId: secret["private_key_id"],
			},
			Extras: gcr.Extras{
				ServiceAccountJson: extras["service_account_json"],
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
	case constants.DOCKER_HUB:
		var nonSecret map[string]string
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
		}
		return r, nil
	case constants.QUAY:
		var nonSecret map[string]string
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
		}
		return r, nil
	case constants.GCR:
		var nonSecret map[string]string
		err := json.Unmarshal(row.NonSecret, &nonSecret)
		if err != nil {
			return nil, err
		}
		r = &gcr.RegistryGCR{
			RegistryType: row.RegistryType,
			Name:         row.Name,
			NonSecret: gcr.NonSecret{
				RegistryURL: nonSecret["registry_url"],
				ProjectId:   nonSecret["project_id"],
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
	EncryptExtras(aes encryption.AES) error
	DecryptExtras(aes encryption.AES) error
	GetSecret() map[string]interface{}
	GetExtras() map[string]interface{}
	FetchImagesFromRegistry() ([]model.ContainerImage, error)
	GetNamespace() string
	GetRegistryType() string
	GetUsername() string
}
