package gitlab

type RegistryGitlab struct {
	Name         string    `json:"name"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	RegistryType string    `json:"registry_type"`
}

type NonSecret struct {
	GitlabRegistryURL string `json:"gitlab_registry_url"`
	GitlabServerURL   string `json:"gitlab_server_url"`
}

type Secret struct {
	GitlabToken string `json:"gitlab_access_token"`
}
