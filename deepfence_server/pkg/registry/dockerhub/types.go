package dockerhub

type RegistryDockerHub struct {
	Name         string    `json:"name"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	RegistryType string    `json:"registry_type"`
}

type NonSecret struct {
	DockerHubNamespace string `json:"docker_hub_namespace"`
	DockerHubUsername  string `json:"docker_hub_username"`
}

type Secret struct {
	DockerHubPassword string `json:"docker_hub_password"`
}
