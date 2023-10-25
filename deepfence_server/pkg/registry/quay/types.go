package quay

type RegistryQuay struct {
	Name         string    `json:"name" validate:"required,min=2,max=64"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	RegistryType string    `json:"registry_type" validate:"required"`
}

type NonSecret struct {
	QuayNamespace   string `json:"quay_namespace" validate:"required,min=2"`
	QuayRegistryURL string `json:"quay_registry_url" validate:"required,url"`
}

type Secret struct {
	QuayAccessToken string `json:"quay_access_token" validate:"omitempty,min=2"`
}

type ReposResp struct {
	Repositories []Repositories `json:"repositories"`
	NextPage     string         `json:"next_page"`
}

type Repositories struct {
	Namespace    string `json:"namespace"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	IsPublic     bool   `json:"is_public"`
	Kind         string `json:"kind"`
	State        string `json:"state"`
	LastModified int    `json:"last_modified"`
	IsStarred    bool   `json:"is_starred"`
}

type RepoTagsResp struct {
	Namespace      string `json:"namespace"`
	Name           string `json:"name"`
	Kind           string `json:"kind"`
	Description    string `json:"description"`
	IsPublic       bool   `json:"is_public"`
	IsOrganization bool   `json:"is_organization"`
	IsStarred      bool   `json:"is_starred"`
	StatusToken    string `json:"status_token"`
	TrustEnabled   bool   `json:"trust_enabled"`
	TagExpirationS int    `json:"tag_expiration_s"`
	IsFreeAccount  bool   `json:"is_free_account"`
	State          string `json:"state"`
	Tags           Tags   `json:"tags"`
	CanWrite       bool   `json:"can_write"`
	CanAdmin       bool   `json:"can_admin"`
}

type Tags map[string]Tag

type Tag struct {
	Name           string `json:"name"`
	Size           int    `json:"size"`
	LastModified   string `json:"last_modified"`
	ManifestDigest string `json:"manifest_digest"`
}
