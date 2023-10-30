package gitlab

type RegistryGitlab struct {
	Name         string    `json:"name" validate:"required,min=2,max=64"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	RegistryType string    `json:"registry_type" validate:"required"`
}

type NonSecret struct {
	GitlabRegistryURL string `json:"gitlab_registry_url" validate:"required,min=2"`
	GitlabServerURL   string `json:"gitlab_server_url" validate:"required,url"`
}

type Secret struct {
	GitlabToken string `json:"gitlab_access_token" validate:"omitempty,min=2"`
}
