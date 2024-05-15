package quay

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

func New(data []byte) (*RegistryQuay, error) {
	var r RegistryQuay
	err := json.Unmarshal(data, &r)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (d *RegistryQuay) ValidateFields(v *validator.Validate) error {
	return v.Struct(d)
}

func (d *RegistryQuay) IsValidCredential() bool {
	if d.NonSecret.QuayNamespace == "" {
		return false
	}

	listRepos := "%s/api/v1/repository?public=true&namespace=%s"
	url := fmt.Sprintf(listRepos, d.NonSecret.QuayRegistryURL, d.NonSecret.QuayNamespace)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", d.Secret.QuayAccessToken))

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

func (d *RegistryQuay) EncryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.QuayAccessToken, err = aes.Encrypt(d.Secret.QuayAccessToken)
	return err
}

func (d *RegistryQuay) DecryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.QuayAccessToken, err = aes.Decrypt(d.Secret.QuayAccessToken)
	return err
}

func (d *RegistryQuay) EncryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryQuay) DecryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryQuay) FetchImagesFromRegistry(ctx context.Context) ([]model.IngestedContainerImage, error) {
	_, span := telemetry.NewSpan(ctx, "registry", "fetch-images-from-registry")
	defer span.End()
	return listImages(d.NonSecret.QuayRegistryURL, d.NonSecret.QuayNamespace, d.Secret.QuayAccessToken)
}

// getters
func (d *RegistryQuay) GetSecret() map[string]interface{} {
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

func (d *RegistryQuay) GetExtras() map[string]interface{} {
	return map[string]interface{}{}
}

func (d *RegistryQuay) GetNamespace() string {
	return d.NonSecret.QuayNamespace
}

func (d *RegistryQuay) GetRegistryType() string {
	return d.RegistryType
}

func (d *RegistryQuay) GetUsername() string {
	return ""
}
