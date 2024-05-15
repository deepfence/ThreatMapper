package gcr

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

func New(data []byte) (*RegistryGCR, error) {
	var r RegistryGCR
	err := json.Unmarshal(data, &r)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (d *RegistryGCR) ValidateFields(v *validator.Validate) error {
	return v.Struct(d)
}

func (d *RegistryGCR) IsValidCredential() bool {
	if d.NonSecret.RegistryURL == "" {
		return false
	}

	listRepos := "%s/v2/_catalog"
	url := fmt.Sprintf(listRepos, d.NonSecret.RegistryURL)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth("_json_key", d.Extras.ServiceAccountJSON)

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

func (d *RegistryGCR) EncryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.PrivateKeyID, err = aes.Encrypt(d.Secret.PrivateKeyID)
	return err
}

func (d *RegistryGCR) DecryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.PrivateKeyID, err = aes.Decrypt(d.Secret.PrivateKeyID)
	return err
}

func (d *RegistryGCR) EncryptExtras(aes encryption.AES) error {
	var err error
	d.Extras.ServiceAccountJSON, err = aes.Encrypt(d.Extras.ServiceAccountJSON)
	return err
}

func (d *RegistryGCR) DecryptExtras(aes encryption.AES) error {
	var err error
	d.Extras.ServiceAccountJSON, err = aes.Decrypt(d.Extras.ServiceAccountJSON)
	return err
}

func (d *RegistryGCR) FetchImagesFromRegistry(ctx context.Context) ([]model.IngestedContainerImage, error) {
	_, span := telemetry.NewSpan(ctx, "registry", "fetch-images-from-registry")
	defer span.End()
	return listImagesRegistryV2(d.NonSecret.RegistryURL, d.NonSecret.ProjectID,
		"_json_key", d.Extras.ServiceAccountJSON)
}

// getters
func (d *RegistryGCR) GetSecret() map[string]interface{} {
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

func (d *RegistryGCR) GetExtras() map[string]interface{} {
	var extras map[string]interface{}
	b, err := json.Marshal(d.Extras)
	if err != nil {
		log.Error().Msg(err.Error())
		return extras
	}
	if err := json.Unmarshal(b, &extras); err != nil {
		log.Error().Msg(err.Error())
		return extras
	}
	return extras
}

func (d *RegistryGCR) GetNamespace() string {
	return d.NonSecret.ProjectID
}

func (d *RegistryGCR) GetRegistryType() string {
	return constants.GCR
}

func (d *RegistryGCR) GetUsername() string {
	return ""
}
