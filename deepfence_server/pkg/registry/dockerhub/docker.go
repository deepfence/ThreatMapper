package dockerhub

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/go-playground/validator/v10"
)

const dockerHubURL = "https://hub.docker.com/v2"

func New(requestByte []byte) (*RegistryDockerHub, error) {
	r := RegistryDockerHub{}
	err := json.Unmarshal(requestByte, &r)
	if err != nil {
		return &r, err
	}
	return &r, nil
}

func (d *RegistryDockerHub) ValidateFields(v *validator.Validate) error {
	err := v.Struct(d)
	if (err != nil) || d.NonSecret.IsPublic == "true" {
		return err
	}

	type AuthInfo struct {
		DockerHubUsername string `json:"docker_hub_username" validate:"required,min=2"`
		DockerHubPassword string `json:"docker_hub_password" validate:"required,min=2"`
	}

	auth := AuthInfo{}
	auth.DockerHubUsername = d.NonSecret.DockerHubUsername
	auth.DockerHubPassword = d.Secret.DockerHubPassword
	return v.Struct(auth)
}

func (d *RegistryDockerHub) IsValidCredential() bool {
	if d.NonSecret.DockerHubUsername == "" {
		return d.NonSecret.IsPublic == "true"
	}

	jsonData := map[string]interface{}{"username": d.NonSecret.DockerHubUsername, "password": d.Secret.DockerHubPassword}

	jsonValue, err := json.Marshal(jsonData)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}

	req, err := http.NewRequest("POST", dockerHubURL+"/users/login/", bytes.NewBuffer(jsonValue))
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Error().Msgf("failed to authenticate, response: %+v", resp)
	}

	return resp.StatusCode == http.StatusOK
}

func (d *RegistryDockerHub) EncryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.DockerHubPassword, err = aes.Encrypt(d.Secret.DockerHubPassword)
	return err
}

func (d *RegistryDockerHub) DecryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.DockerHubPassword, err = aes.Decrypt(d.Secret.DockerHubPassword)
	return err
}

func (d *RegistryDockerHub) EncryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryDockerHub) DecryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryDockerHub) FetchImagesFromRegistry(ctx context.Context) ([]model.IngestedContainerImage, error) {
	_, span := telemetry.NewSpan(ctx, "registry", "fetch-images-from-registry")
	defer span.End()
	return getImagesList(d.NonSecret.DockerHubUsername, d.Secret.DockerHubPassword, d.NonSecret.DockerHubNamespace)
}

// getters
func (d *RegistryDockerHub) GetSecret() map[string]interface{} {
	var secret map[string]interface{}
	b, err := json.Marshal(d.Secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(b, &secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	return secret
}

func (d *RegistryDockerHub) GetExtras() map[string]interface{} {
	return map[string]interface{}{}
}

func (d *RegistryDockerHub) GetNamespace() string {
	return d.NonSecret.DockerHubNamespace
}

func (d *RegistryDockerHub) GetRegistryType() string {
	return d.RegistryType
}

func (d *RegistryDockerHub) GetUsername() string {
	return d.NonSecret.DockerHubUsername
}
