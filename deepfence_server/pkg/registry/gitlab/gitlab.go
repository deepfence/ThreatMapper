package gitlab

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

func New(requestByte []byte) (*RegistryGitlab, error) {
	r := RegistryGitlab{}
	err := json.Unmarshal(requestByte, &r)
	if err != nil {
		return &r, err
	}
	return &r, nil
}

func (e *RegistryGitlab) ValidateFields(v *validator.Validate) error {
	return v.Struct(e)
}

func (e *RegistryGitlab) IsValidCredential() bool {
	if e.Secret.GitlabToken == "" {
		return true
	}

	url := fmt.Sprintf("%s/api/v4/projects?private_token=%s&simple=false&membership=true", e.NonSecret.GitlabServerURL, e.Secret.GitlabToken)

	resp, err := http.Get(url)
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

func (e *RegistryGitlab) EncryptSecret(aes encryption.AES) error {
	var err error
	e.Secret.GitlabToken, err = aes.Encrypt(e.Secret.GitlabToken)
	return err
}

func (e *RegistryGitlab) DecryptSecret(aes encryption.AES) error {
	var err error
	e.Secret.GitlabToken, err = aes.Decrypt(e.Secret.GitlabToken)
	return err
}

func (e *RegistryGitlab) EncryptExtras(aes encryption.AES) error {
	return nil
}

func (e *RegistryGitlab) DecryptExtras(aes encryption.AES) error {
	return nil
}

func (e *RegistryGitlab) FetchImagesFromRegistry(ctx context.Context) ([]model.IngestedContainerImage, error) {
	_, span := telemetry.NewSpan(ctx, "registry", "fetch-images-from-registry")
	defer span.End()
	return listImages(e.NonSecret.GitlabServerURL, e.NonSecret.GitlabRegistryURL, e.Secret.GitlabToken)
}

// getters
func (e *RegistryGitlab) GetSecret() map[string]interface{} {
	var secret map[string]interface{}
	b, err := json.Marshal(e.Secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = json.Unmarshal(b, &secret)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	return secret
}

func (e *RegistryGitlab) GetExtras() map[string]interface{} {
	return map[string]interface{}{}
}

func (e *RegistryGitlab) GetNamespace() string {
	return e.NonSecret.GitlabRegistryURL
}

func (e *RegistryGitlab) GetRegistryType() string {
	return e.RegistryType
}

func (e *RegistryGitlab) GetUsername() string {
	return ""
}
