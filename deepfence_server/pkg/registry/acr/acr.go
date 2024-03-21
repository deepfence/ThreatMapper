package acr

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/go-playground/validator/v10"
)

func New(data []byte) (*RegistryACR, error) {
	var r RegistryACR
	err := json.Unmarshal(data, &r)
	if err != nil {
		return nil, err
	}

	return &r, nil
}

func (d *RegistryACR) ValidateFields(v *validator.Validate) error {
	return v.Struct(d)
}

func (d *RegistryACR) IsValidCredential() bool {
	if d.NonSecret.AzureRegistryURL == "" {
		return false
	}

	listRepos := "%s/v2/_catalog"
	url := fmt.Sprintf(listRepos, d.NonSecret.AzureRegistryURL)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(d.NonSecret.AzureRegistryUsername, d.Secret.AzureRegistryPassword)

	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

func (d *RegistryACR) EncryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.AzureRegistryPassword, err = aes.Encrypt(d.Secret.AzureRegistryPassword)
	return err
}

func (d *RegistryACR) DecryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.AzureRegistryPassword, err = aes.Decrypt(d.Secret.AzureRegistryPassword)
	return err
}

func (d *RegistryACR) EncryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryACR) DecryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryACR) FetchImagesFromRegistry(ctx context.Context) ([]model.IngestedContainerImage, error) {
	_, span := telemetry.NewSpan(ctx, "registry", "fetch-images-from-registry")
	defer span.End()
	return listImagesRegistryV2(d.NonSecret.AzureRegistryURL, "",
		d.NonSecret.AzureRegistryUsername, d.Secret.AzureRegistryPassword)
}

// getters
func (d *RegistryACR) GetSecret() map[string]interface{} {
	var secret map[string]interface{}
	b, err := json.Marshal(d.Secret)
	if err != nil {
		log.Error().Msg(err.Error())
		return secret
	}
	if err := json.Unmarshal(b, &secret); err != nil {
		log.Error().Msg(err.Error())
		return secret
	}
	return secret
}

func (d *RegistryACR) GetExtras() map[string]interface{} {
	return map[string]interface{}{}
}

func (d *RegistryACR) GetNamespace() string {
	return d.NonSecret.AzureRegistryUsername
}

func (d *RegistryACR) GetRegistryType() string {
	return constants.ACR
}

func (d *RegistryACR) GetUsername() string {
	return ""
}
