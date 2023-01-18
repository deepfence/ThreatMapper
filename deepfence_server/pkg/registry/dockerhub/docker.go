package dockerhub

import (
	"bytes"
	"encoding/json"
	"net/http"

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

	jsonValue, _ := json.Marshal(jsonData)

	req, _ := http.NewRequest("POST", dockerHubURL, bytes.NewBuffer(jsonValue))
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
	d.Secret.DockerHubPassword = aes.Encrypt(d.Secret.DockerHubPassword)
	return nil
}

func (d *RegistryDockerHub) DecryptSecret(aes encryption.AES) error {
	// todo
	return nil
}

// getters
func (d *RegistryDockerHub) GetSecret() map[string]interface{} {
	var secret map[string]interface{}
	b, _ := json.Marshal(d.Secret)
	json.Unmarshal(b, &secret)
	return secret
}
