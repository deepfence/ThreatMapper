package dockerhub

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/encryption"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

const dockerHubURL = "https://hub.docker.com/v2"

func New(requestByte []byte) (*RegistryDockerHub, error) {
	r := RegistryDockerHub{}
	err := json.Unmarshal(requestByte, &r)
	if err != nil {
		return &r, err
	}
	return &r, nil
}

func (d *RegistryDockerHub) IsValidCredential() bool {
	if d.NonSecret.DockerHubUsername == "" {
		return true
	}

	jsonData := map[string]interface{}{"username": d.NonSecret.DockerHubUsername, "password": d.Secret.DockerHubPassword}

	jsonValue, err := json.Marshal(jsonData)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}

	req, err := http.NewRequest("POST", dockerHubURL+"/users/login/", bytes.NewBuffer(jsonValue))
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

func (d *RegistryDockerHub) EncryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.DockerHubPassword, err = aes.Encrypt(d.Secret.DockerHubPassword)
	return err
}

func (d *RegistryDockerHub) DecryptSecret(aes encryption.AES) error {
	var err error
	d.Secret.DockerHubPassword, err = aes.Decrypt(d.Secret.DockerHubPassword)
	return err
}

func (d *RegistryDockerHub) EncryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryDockerHub) DecryptExtras(aes encryption.AES) error {
	return nil
}

func (d *RegistryDockerHub) FetchImagesFromRegistry() ([]model.ContainerImage, error) {
	return getImagesList(d.NonSecret.DockerHubUsername, d.Secret.DockerHubPassword, d.NonSecret.DockerHubNamespace)
}

// getters
func (d *RegistryDockerHub) GetSecret() map[string]interface{} {
	var secret map[string]interface{}
	b, _ := json.Marshal(d.Secret)
	json.Unmarshal(b, &secret)
	return secret
}

func (d *RegistryDockerHub) GetExtras() map[string]interface{} {
	return map[string]interface{}{}
}

func (d *RegistryDockerHub) GetNamespace() string {
	return d.NonSecret.DockerHubNamespace
}

func (d *RegistryDockerHub) GetRegistryType() string {
	return d.RegistryType
}

func (d *RegistryDockerHub) GetUsername() string {
	return d.NonSecret.DockerHubUsername
}
