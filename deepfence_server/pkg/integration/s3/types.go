package s3

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/go-playground/validator/v10"
)

type S3 struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
}

type Config struct {
	S3BucketName string `json:"s3_bucket_name" validate:"required" required:"true"`
	AWSAccessKey string `json:"aws_access_key" validate:"required" required:"true"`
	AWSSecretKey string `json:"aws_secret_key" validate:"required" required:"true"`
	S3FolderName string `json:"s3_folder_name" validate:"required" required:"true"`
	AWSRegion    string `json:"aws_region" validate:"required" required:"true"`
}

func (s S3) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(s.Config)
}
