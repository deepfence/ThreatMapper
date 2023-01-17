package model

type RegistryAddReq struct {
	Name         string `json:"name"`
	NonSecret    map[string]interface{}
	Secret       map[string]interface{}
	RegistryType string `json:"registry_type"`
}

type DockerNonSecretField struct {
	DockerHubNamespace string `json:"docker_hub_namespace"`
	DockerHubUsername  string `json:"docker_hub_username"`
}

type DockerSecretField struct {
	DockerHubPassword string `json:"docker_hub_password"`
}
