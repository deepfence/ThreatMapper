package dockerhub

import (
	"bytes"
	"encoding/json"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

const dockerHubURL = "https://hub.docker.com/v2"

// self.docker_hub_url = "https://hub.docker.com/v2"

//     def validate(self):
//         try:
//             # not authenticating for empty username
//             if self.docker_hub_username == "" or self.docker_hub_username is None:
//                 return True
//             resp = requests.post(self.docker_hub_url + "/users/login/",
//                                  json={"username": self.docker_hub_username, "password": self.docker_hub_password})
//             if resp.status_code == 200:
//                 return True
//             else:
//                 return False
//         except Exception as e:
//             raise DFError("Something went wrong while validating Docker hub registry credentails", error=e)

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
