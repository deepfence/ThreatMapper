package acr

import "time"

type RegistryACR struct {
	Name         string    `json:"name"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	RegistryType string    `json:"registry_type"`
}

type NonSecret struct {
	AzureRegistryURL      string `json:"azure_registry_url"`
	AzureRegistryUsername string `json:"azure_registry_username"`
}

type Secret struct {
	AzureRegistryPassword string `json:"azure_registry_password"`
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
