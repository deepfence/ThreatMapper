package dockerprivate

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/encryption"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

func New(requestByte []byte) (*RegistryDockerPrivate, error) {
	r := RegistryDockerPrivate{}
	err := json.Unmarshal(requestByte, &r)
	if err != nil {
		return &r, err
	}
	return &r, nil
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

func (d *RegistryDockerPrivate) FetchImagesFromRegistry() ([]model.IngestedContainerImage, error) {
	return listImagesRegistryV2(d.NonSecret.DockerRegistryURL, d.NonSecret.DockerUsername, d.Secret.DockerPassword)
}

// getters
func (d *RegistryDockerPrivate) GetSecret() map[string]interface{} {
	var secret map[string]interface{}
	b, _ := json.Marshal(d.Secret)
	json.Unmarshal(b, &secret)
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
