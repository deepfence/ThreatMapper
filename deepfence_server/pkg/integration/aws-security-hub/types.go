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
	AWSAccountId string `json:"aws_account_id" validate:"required,number,max=12,startswith=12" required:"true"`
	AWSAccessKey string `json:"aws_access_key" validate:"required" required:"true"`
	AWSSecretKey string `json:"aws_secret_key" validate:"required" required:"true"`
	AWSRegion    string `json:"aws_region" validate:"required" required:"true"`
}

func (a AwsSecurityHub) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(a.Config)
}
