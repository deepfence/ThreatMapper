package dockerhub

import "time"

type RegistryDockerHub struct {
	Name         string    `json:"name" validate:"required,min=2,max=64"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	RegistryType string    `json:"registry_type" validate:"required"`
}

type NonSecret struct {
	IsPublic           string `json:"is_public" validate:"required"`
	DockerHubNamespace string `json:"docker_hub_namespace" validate:"required,min=2"`
	DockerHubUsername  string `json:"docker_hub_username" validate:"omitempty,min=2"`
}

type Secret struct {
	DockerHubPassword string `json:"docker_hub_password" validate:"omitempty,min=2"`
}

type ImageWithTag struct {
	Name   string
	Images Images
}

type ImageTag struct {
	Count    int         `json:"count,omitempty"`
	Next     string      `json:"next,omitempty"`
	Previous interface{} `json:"previous,omitempty"`
	Results  []Results   `json:"results,omitempty"`
}
type Images struct {
	Architecture string      `json:"architecture,omitempty"`
	Features     string      `json:"features,omitempty"`
	Variant      interface{} `json:"variant,omitempty"`
	Digest       string      `json:"digest,omitempty"`
	Os           string      `json:"os,omitempty"`
	OsFeatures   string      `json:"os_features,omitempty"`
	OsVersion    interface{} `json:"os_version,omitempty"`
	Size         int         `json:"size,omitempty"`
	Status       string      `json:"status,omitempty"`
	LastPulled   time.Time   `json:"last_pulled,omitempty"`
	LastPushed   time.Time   `json:"last_pushed,omitempty"`
}
type Results struct {
	Creator             int       `json:"creator,omitempty"`
	ID                  int       `json:"id,omitempty"`
	Images              []Images  `json:"images,omitempty"`
	LastUpdated         time.Time `json:"last_updated,omitempty"`
	LastUpdater         int       `json:"last_updater,omitempty"`
	LastUpdaterUsername string    `json:"last_updater_username,omitempty"`
	Name                string    `json:"name,omitempty"`
	Repository          int       `json:"repository,omitempty"`
	FullSize            int       `json:"full_size,omitempty"`
	V2                  bool      `json:"v2,omitempty"`
	TagStatus           string    `json:"tag_status,omitempty"`
	TagLastPulled       time.Time `json:"tag_last_pulled,omitempty"`
	TagLastPushed       time.Time `json:"tag_last_pushed,omitempty"`
	MediaType           string    `json:"media_type,omitempty"`
	ContentType         string    `json:"content_type,omitempty"`
	Digest              string    `json:"digest,omitempty"`
}
