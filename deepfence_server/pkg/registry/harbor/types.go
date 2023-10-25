package harbor

import "time"

type RegistryHarbor struct {
	Name         string    `json:"name" validate:"required,min=2,max=64"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	RegistryType string    `json:"registry_type" validate:"required"`
}

type NonSecret struct {
	HarborRegistryURL string `json:"harbor_registry_url" validate:"required,url"`
	HarborUsername    string `json:"harbor_username" validate:"omitempty,min=2"`
	HarborProjectName string `json:"harbor_project_name" validate:"required,min=2"`
}

type Secret struct {
	HarborPassword string `json:"harbor_password" validate:"omitempty,min=2"`
}

type Repository struct {
	UpdateTime    time.Time `json:"update_time"`
	Description   string    `json:"description"`
	PullCount     int       `json:"pull_count"`
	CreationTime  time.Time `json:"creation_time"`
	ArtifactCount int       `json:"artifact_count"`
	ProjectID     int       `json:"project_id"`
	ID            int       `json:"id"`
	Name          string    `json:"name"`
}

type Artifact struct {
	Digest            string    `json:"digest"`
	Icon              string    `json:"icon"`
	ID                int       `json:"id"`
	ManifestMediaType string    `json:"manifest_media_type"`
	MediaType         string    `json:"media_type"`
	ProjectID         int       `json:"project_id"`
	PullTime          time.Time `json:"pull_time"`
	PushTime          time.Time `json:"push_time"`
	RepositoryID      int       `json:"repository_id"`
	Size              int       `json:"size"`
	Tags              []Tags    `json:"tags"`
	Type              string    `json:"type"`
}

type Tags struct {
	ArtifactID   int       `json:"artifact_id"`
	ID           int       `json:"id"`
	Immutable    bool      `json:"immutable"`
	Name         string    `json:"name"`
	PullTime     time.Time `json:"pull_time"`
	PushTime     time.Time `json:"push_time"`
	RepositoryID int       `json:"repository_id"`
	Signed       bool      `json:"signed"`
}
