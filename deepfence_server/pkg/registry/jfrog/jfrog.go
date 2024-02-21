package jfrog

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

func New(requestByte []byte) (*RegistryJfrog, error) {
	r := RegistryJfrog{}
	err := json.Unmarshal(requestByte, &r)
	if err != nil {
		return &r, err
	}
	return &r, nil
}

func (d *RegistryJfrog) ValidateFields(v *validator.Validate) error {
	return v.Struct(d)
}

func (d *RegistryJfrog) IsValidCredential() bool {
	if d.NonSecret.JfrogRegistryURL == "" {
		return false
	}

	listRepos := "%s/artifactory/api/docker/%s/v2/_catalog?n=1"
	url := fmt.Sprintf(listRepos, d.NonSecret.JfrogRegistryURL, d.NonSecret.JfrogRepository)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(d.NonSecret.JfrogUsername, d.Secret.JfrogPassword)

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

func (d *RegistryJfrog) EncryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.JfrogPassword, err = aes.Encrypt(d.Secret.JfrogPassword)
	return err
}

func (d *RegistryJfrog) DecryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.JfrogPassword, err = aes.Decrypt(d.Secret.JfrogPassword)
	return err
}

func (d *RegistryJfrog) EncryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryJfrog) DecryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryJfrog) FetchImagesFromRegistry(ctx context.Context) ([]model.IngestedContainerImage, error) {
	_, span := telemetry.NewSpan(ctx, "registry", "fetch-images-from-registry")
	defer span.End()
	return listImagesRegistryV2(d.NonSecret.JfrogRegistryURL, d.NonSecret.JfrogRepository,
		d.NonSecret.JfrogUsername, d.Secret.JfrogPassword)
}

// getters
func (d *RegistryJfrog) GetSecret() map[string]interface{} {
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

func (d *RegistryJfrog) GetExtras() map[string]interface{} {
	return map[string]interface{}{}
}

func (d *RegistryJfrog) GetNamespace() string {
	return d.NonSecret.JfrogRepository
}

func (d *RegistryJfrog) GetRegistryType() string {
	return d.RegistryType
}

func (d *RegistryJfrog) GetUsername() string {
	return d.NonSecret.JfrogUsername
}
