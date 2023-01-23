package dockerhub

import (
	"bytes"
	"encoding/json"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
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

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	if resp.StatusCode == http.StatusOK {
		return true
	}
	return false
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

func (d *RegistryDockerHub) FetchImagesFromRegistry() (model.RegistryImages, error) {
	b, err := getImagesList(d.NonSecret.DockerHubUsername, d.Secret.DockerHubPassword, d.NonSecret.DockerHubNamespace)
	if err != nil {
		return model.RegistryImages{}, err
	}

	var images model.RegistryImages
	err = json.Unmarshal(b, &images)
	if err != nil {
		return model.RegistryImages{}, err
	}
	return images, nil
}

// getters
func (d *RegistryDockerHub) GetSecret() map[string]interface{} {
	var secret map[string]interface{}
	b, _ := json.Marshal(d.Secret)
	json.Unmarshal(b, &secret)
	return secret
}
