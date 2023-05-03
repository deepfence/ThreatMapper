package ecr

import "time"

type RegistryECR struct {
	Name         string    `json:"name"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	RegistryType string    `json:"registry_type"`
}

type NonSecret struct {
	UseIAMRole           bool   `json:"use_iam_role"`
	IsPublic             bool   `json:"is_public"`
	AWSAccessKeyID       string `json:"aws_access_key_id"`
	AWSRegionName        string `json:"aws_region_name"`
	AWSAccountID         string `json:"aws_account_id"` // legacy: registry_id
	TargetAccountRoleARN string `json:"target_account_role_arn"`
}

type Secret struct {
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
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
