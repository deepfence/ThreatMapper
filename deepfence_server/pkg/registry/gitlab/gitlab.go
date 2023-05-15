package gitlab

import (
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/encryption"
)

func New(requestByte []byte) (*RegistryGitlab, error) {
	r := RegistryGitlab{}
	err := json.Unmarshal(requestByte, &r)
	if err != nil {
		return &r, err
	}
	return &r, nil
}

func (e *RegistryGitlab) IsValidCredential() bool {
	return true
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

func (e *RegistryGitlab) FetchImagesFromRegistry() ([]model.IngestedContainerImage, error) {
	return listImages(e.NonSecret.GitlabServerURL, e.NonSecret.GitlabRegistryURL, e.Secret.GitlabToken)
}

// getters
func (e *RegistryGitlab) GetSecret() map[string]interface{} {
	var secret map[string]interface{}
	b, _ := json.Marshal(e.Secret)
	json.Unmarshal(b, &secret)
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
