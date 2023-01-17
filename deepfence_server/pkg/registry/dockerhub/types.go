package dockerhub

type RegistryDockerHub struct {
	Name      string `json:"name"`
	NonSecret struct {
		DockerHubNamespace string `json:"docker_hub_namespace"`
		DockerHubUsername  string `json:"docker_hub_username"`
	} `json:"non_secret"`
	Secret struct {
		DockerHubPassword string `json:"docker_hub_password"`
	} `json:"secret"`
	RegistryType string `json:"registry_type"`
}
