package gcr

type RegistryGCR struct {
	Name         string    `json:"name" validate:"required,min=2,max=64"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	Extras       Extras    `json:"extras"`
	RegistryType string    `json:"registry_type" validate:"required"`
}

type NonSecret struct {
	RegistryURL string `json:"registry_url" validate:"required,url"`
	ProjectID   string `json:"project_id" validate:"required,min=6,max=30"`
}

type Secret struct {
	PrivateKeyID string `json:"private_key_id" validate:"required"`
}

type Extras struct {
	ServiceAccountJSON string `json:"service_account_json" formData:"service_account_json"`
}

type ServiceAccountJSON struct {
	Type                    string `json:"type"`
	ProjectID               string `json:"project_id"`
	PrivateKeyID            string `json:"private_key_id"`
	PrivateKey              string `json:"private_key"`
	ClientEmail             string `json:"client_email"`
	ClientID                string `json:"client_id"`
	AuthURI                 string `json:"auth_uri"`
	TokenURI                string `json:"token_uri"`
	AuthProviderX509CertURL string `json:"auth_provider_x509_cert_url"`
	ClientX509CertURL       string `json:"client_x509_cert_url"`
}

type ReposResp struct {
	Repositories []string `json:"repositories"`
}

type RepoTagsResp struct {
	Child    []interface{}       `json:"child"`
	Manifest map[string]Manifest `json:"manifest"`
	Name     string              `json:"name"`
	Tags     []string            `json:"tags"`
}

type Manifest struct {
	MediaType      string   `json:"mediaType"`
	Tag            []string `json:"tag"`
	TimeUploadedMs string   `json:"timeUploadedMs"`
	TimeCreatedMs  string   `json:"timeCreatedMs"`
	ImageSizeBytes string   `json:"imageSizeBytes"`
}

type ManifestsResp struct {
	SchemaVersion int         `json:"schemaVersion"`
	MediaType     string      `json:"mediaType"`
	Manifests     []Manifests `json:"manifests"`
}

type Platform struct {
	Architecture string   `json:"architecture"`
	Os           string   `json:"os"`
	Variant      string   `json:"variant"`
	Features     []string `json:"features"`
}

type Manifests struct {
	MediaType string   `json:"mediaType"`
	Size      int      `json:"size"`
	Digest    string   `json:"digest"`
	Platform  Platform `json:"platform,omitempty"`
}
