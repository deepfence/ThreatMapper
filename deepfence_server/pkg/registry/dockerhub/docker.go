package dockerhub

import (
	"bytes"
	"encoding/json"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

const dockerHubURL = "https://hub.docker.com/v2"

func New() *RegistryDockerHub {
	return &RegistryDockerHub{}
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
