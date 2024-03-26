package ecr

import "time"

const (
	trueStr  = "true"
	falseStr = "false"

	publicRegistryRegion = "us-east-1"
)

type RegistryECR struct {
	Name         string    `json:"name" validate:"required,min=2,max=64"`
	NonSecret    NonSecret `json:"non_secret"`
	Secret       Secret    `json:"secret"`
	RegistryType string    `json:"registry_type" validate:"required"`
}

type NonSecret struct {
	UseIAMRole           string `json:"use_iam_role" validate:"required,oneof=true false"`
	IsPublic             string `json:"is_public" validate:"required,oneof=true false"`
	AWSAccessKeyID       string `json:"aws_access_key_id" validate:"omitempty,min=16,max=128"`
	AWSRegionName        string `json:"aws_region_name" validate:"required,oneof=us-east-1 us-east-2 us-west-1 us-west-2 af-south-1 ap-east-1 ap-south-1 ap-northeast-1 ap-northeast-2 ap-northeast-3 ap-southeast-1 ap-southeast-2 ap-southeast-3 ca-central-1 eu-central-1 eu-west-1 eu-west-2 eu-west-3 eu-south-1 eu-north-1 me-south-1 me-central-1 sa-east-1 us-gov-east-1 us-gov-west-1"`
	AWSAccountID         string `json:"aws_account_id" validate:"required,min=10,max=12"` // legacy: registry_id
	TargetAccountRoleARN string `json:"target_account_role_arn" validate:"omitempty,startswith=arn,min=8"`
}

type Secret struct {
	AWSSecretAccessKey string `json:"aws_secret_access_key" validate:"omitempty,min=16,max=128"`
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

type AWSSelfQuery struct {
	AccountID string `json:"accountId"`
}
