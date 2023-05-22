package gcr

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/golang_deepfence_sdk/utils/encryption"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
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
	req.SetBasicAuth("_json_key", d.Extras.ServiceAccountJson)

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
	d.Secret.ProjectId, err = aes.Encrypt(d.Secret.ProjectId)
	d.Secret.PrivateKeyId, err = aes.Encrypt(d.Secret.PrivateKeyId)
	return err
}

func (d *RegistryGCR) DecryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.ProjectId, err = aes.Decrypt(d.Secret.ProjectId)
	d.Secret.PrivateKeyId, err = aes.Decrypt(d.Secret.PrivateKeyId)
	return err
}

func (d *RegistryGCR) EncryptExtras(aes encryption.AES) error {
	var err error
	d.Extras.ServiceAccountJson, err = aes.Encrypt(d.Extras.ServiceAccountJson)
	return err
}

func (d *RegistryGCR) DecryptExtras(aes encryption.AES) error {
	var err error
	d.Extras.ServiceAccountJson, err = aes.Decrypt(d.Extras.ServiceAccountJson)
	return err
}

func (d *RegistryGCR) FetchImagesFromRegistry() ([]model.IngestedContainerImage, error) {
	return listImagesRegistryV2(d.NonSecret.RegistryURL, d.NonSecret.ProjectId,
		"_json_key", d.Extras.ServiceAccountJson)
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
	return d.NonSecret.ProjectId
}

func (d *RegistryGCR) GetRegistryType() string {
	return constants.GCR
}

func (d *RegistryGCR) GetUsername() string {
	return ""
}
