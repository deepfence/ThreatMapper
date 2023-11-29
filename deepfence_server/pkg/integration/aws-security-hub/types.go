package awssecurityhub

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/go-playground/validator/v10"
)

type AwsSecurityHub struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
	Resource         string                  `json:"resource"`
}

type Config struct {
	AWSAccountID []string `json:"aws_account_id"`
	AWSAccessKey string   `json:"aws_access_key" validate:"required,min=16,max=128" required:"true"`
	AWSSecretKey string   `json:"aws_secret_key" validate:"required,min=16,max=128" required:"true"`
	AWSRegion    string   `json:"aws_region" validate:"required,oneof=us-east-1 us-east-2 us-west-1 us-west-2 af-south-1 ap-east-1 ap-south-1 ap-northeast-1 ap-northeast-2 ap-northeast-3 ap-southeast-1 ap-southeast-2 ap-southeast-3 ca-central-1 eu-central-1 eu-west-1 eu-west-2 eu-west-3 eu-south-1 eu-north-1 me-south-1 me-central-1 sa-east-1 us-gov-east-1 us-gov-west-1" required:"true"`
}

func (a AwsSecurityHub) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(a.Config)
}
