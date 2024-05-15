package dockerprivate

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/go-playground/validator/v10"
)

func New(requestByte []byte) (*RegistryDockerPrivate, error) {
	r := RegistryDockerPrivate{}
	err := json.Unmarshal(requestByte, &r)
	if err != nil {
		return &r, err
	}
	return &r, nil
}

func (d *RegistryDockerPrivate) ValidateFields(v *validator.Validate) error {
	err := v.Struct(d)
	if (err != nil) || d.NonSecret.IsPublic == "true" {
		return err
	}

	type AuthInfo struct {
		DockerUsername string `json:"docker_username" validate:"required,min=2"`
		DockerPassword string `json:"docker_password" validate:"required,min=2"`
	}

	auth := AuthInfo{}
	auth.DockerUsername = d.NonSecret.DockerUsername
	auth.DockerPassword = d.Secret.DockerPassword
	return v.Struct(auth)

}

func (d *RegistryDockerPrivate) IsValidCredential() bool {
	if d.NonSecret.DockerRegistryURL == "" {
		return false
	}

	listRepos := "%s/v2/_catalog"
	url := fmt.Sprintf(listRepos, d.NonSecret.DockerRegistryURL)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(d.NonSecret.DockerUsername, d.Secret.DockerPassword)

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

func (d *RegistryDockerPrivate) EncryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.DockerPassword, err = aes.Encrypt(d.Secret.DockerPassword)
	return err
}

func (d *RegistryDockerPrivate) DecryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.DockerPassword, err = aes.Decrypt(d.Secret.DockerPassword)
	return err
}

func (d *RegistryDockerPrivate) EncryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryDockerPrivate) DecryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryDockerPrivate) FetchImagesFromRegistry(ctx context.Context) ([]model.IngestedContainerImage, error) {
	_, span := telemetry.NewSpan(ctx, "registry", "fetch-images-from-registry")
	defer span.End()
	return listImagesRegistryV2(d.NonSecret.DockerRegistryURL, d.NonSecret.DockerUsername, d.Secret.DockerPassword)
}

// getters
func (d *RegistryDockerPrivate) GetSecret() map[string]interface{} {
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

func (d *RegistryDockerPrivate) GetExtras() map[string]interface{} {
	return map[string]interface{}{}
}

func (d *RegistryDockerPrivate) GetNamespace() string {
	return d.NonSecret.DockerUsername
}

func (d *RegistryDockerPrivate) GetRegistryType() string {
	return d.RegistryType
}

func (d *RegistryDockerPrivate) GetUsername() string {
	return d.NonSecret.DockerUsername
}
