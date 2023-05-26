package gitlab

type RegistryGitlab struct {
	Name         string    `json:"name" validate:"required,min=2,max=64"`
	NonSecret    NonSecret `json:"non_secret" validate:"required"`
	Secret       Secret    `json:"secret" validate:"required"`
	RegistryType string    `json:"registry_type" validate:"required"`
}

type NonSecret struct {
	GitlabRegistryURL string `json:"gitlab_registry_url" validate:"required,url"`
	GitlabServerURL   string `json:"gitlab_server_url" validate:"required,min=2"`
}

type Secret struct {
	GitlabToken string `json:"gitlab_access_token" validate:"required,min=2"`
}
