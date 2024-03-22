package harbor

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

func New(data []byte) (*RegistryHarbor, error) {
	var r RegistryHarbor
	err := json.Unmarshal(data, &r)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (d *RegistryHarbor) ValidateFields(v *validator.Validate) error {
	return v.Struct(d)
}

func (d *RegistryHarbor) IsValidCredential() bool {
	if d.NonSecret.HarborRegistryURL == "" {
		return false
	}

	listRepos := "%s/api/v2.0/projects/%s/repositories"
	url := fmt.Sprintf(listRepos, d.NonSecret.HarborRegistryURL, d.NonSecret.HarborProjectName)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(d.NonSecret.HarborUsername, d.Secret.HarborPassword)

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

func (d *RegistryHarbor) EncryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.HarborPassword, err = aes.Encrypt(d.Secret.HarborPassword)
	return err
}

func (d *RegistryHarbor) DecryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.HarborPassword, err = aes.Decrypt(d.Secret.HarborPassword)
	return err
}

func (d *RegistryHarbor) EncryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryHarbor) DecryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryHarbor) FetchImagesFromRegistry(ctx context.Context) ([]model.IngestedContainerImage, error) {
	_, span := telemetry.NewSpan(ctx, "registry", "fetch-images-from-registry")
	defer span.End()
	return listImages(d.NonSecret.HarborRegistryURL, d.NonSecret.HarborProjectName,
		d.NonSecret.HarborUsername, d.Secret.HarborPassword)
}

// getters
func (d *RegistryHarbor) GetSecret() map[string]interface{} {
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

func (d *RegistryHarbor) GetExtras() map[string]interface{} {
	return map[string]interface{}{}
}

func (d *RegistryHarbor) GetNamespace() string {
	return d.NonSecret.HarborProjectName
}

func (d *RegistryHarbor) GetRegistryType() string {
	return d.RegistryType
}

func (d *RegistryHarbor) GetUsername() string {
	return d.NonSecret.HarborUsername
}
