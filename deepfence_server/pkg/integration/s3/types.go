package s3

import (
	"bytes"
	"errors"

	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/go-playground/validator/v10"
)

const (
	trueStr = "true"
)

var (
	errAccessKeyMissing = errors.New("access key and secret key are required")
	errAccountIDMissing = errors.New("account id is required")
)

type S3 struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
	Buffer           *bytes.Buffer
}

type Config struct {
	S3BucketName         string `json:"s3_bucket_name" validate:"required,min=3,max=63" required:"true"`
	AWSAccessKey         string `json:"aws_access_key" validate:"omitempty,min=16,max=128"`
	AWSSecretKey         string `json:"aws_secret_key" validate:"omitempty,min=16,max=128"`
	S3FolderName         string `json:"s3_folder_name" validate:"required,min=1,max=128" required:"true"`
	AWSRegion            string `json:"aws_region" validate:"required,oneof=us-east-1 us-east-2 us-west-1 us-west-2 af-south-1 ap-east-1 ap-south-1 ap-northeast-1 ap-northeast-2 ap-northeast-3 ap-southeast-1 ap-southeast-2 ap-southeast-3 ca-central-1 eu-central-1 eu-west-1 eu-west-2 eu-west-3 eu-south-1 eu-north-1 me-south-1 me-central-1 sa-east-1 us-gov-east-1 us-gov-west-1" required:"true"`
	UseIAMRole           string `json:"use_iam_role" validate:"required,oneof=true false"`
	AWSAccountID         string `json:"aws_account_id" validate:"required,min=10,max=12"`
	TargetAccountRoleARN string `json:"target_account_role_arn" validate:"omitempty,startswith=arn,min=8"`
}

func (s S3) ValidateConfig(validate *validator.Validate) error {
	if s.Config.UseIAMRole != trueStr {
		// Key based authentication
		if s.Config.AWSAccessKey == "" || s.Config.AWSSecretKey == "" {
			return errAccessKeyMissing
		}
	}
	return validate.Struct(s.Config)
}
