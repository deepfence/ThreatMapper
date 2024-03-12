package acr

import "time"

type RegistryACR struct {
	Name         string    `json:"name" validate:"required,min=2,max=64"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	RegistryType string    `json:"registry_type" validate:"required"`
}

type NonSecret struct {
	AzureRegistryURL      string `json:"azure_registry_url" validate:"required,url"`
	AzureRegistryUsername string `json:"azure_registry_username" validate:"required,min=1"`
}

type Secret struct {
	AzureRegistryPassword string `json:"azure_registry_password" validate:"required,min=1"`
}

type ReposResp struct {
	Repositories []string `json:"repositories"`
}

type RepoTagsResp struct {
	Name string   `json:"name"`
	Tags []string `json:"tags"`
}

type ManifestsAzureResp struct {
	Registry  string            `json:"registry"`
	ImageName string            `json:"imageName"`
	Manifests []ManifestV1Azure `json:"manifests"`
}

type ChangeableAttributes struct {
	DeleteEnabled bool `json:"deleteEnabled"`
	WriteEnabled  bool `json:"writeEnabled"`
	ReadEnabled   bool `json:"readEnabled"`
	ListEnabled   bool `json:"listEnabled"`
}

type ManifestV1Azure struct {
	Digest               string               `json:"digest"`
	ImageSize            int                  `json:"imageSize"`
	CreatedTime          time.Time            `json:"createdTime"`
	LastUpdateTime       time.Time            `json:"lastUpdateTime"`
	Architecture         string               `json:"architecture"`
	Os                   string               `json:"os"`
	MediaType            string               `json:"mediaType"`
	ConfigMediaType      string               `json:"configMediaType"`
	Tags                 []string             `json:"tags"`
	ChangeableAttributes ChangeableAttributes `json:"changeableAttributes"`
}
