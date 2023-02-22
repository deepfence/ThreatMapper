package dockerprivate

type RegistryDockerPrivate struct {
	Name         string    `json:"name"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	RegistryType string    `json:"registry_type"`
}

type NonSecret struct {
	DockerRegistryURL string `json:"docker_registry_url"`
	DockerUsername    string `json:"docker_username"`
}

type Secret struct {
	DockerPassword string `json:"docker_password"`
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
