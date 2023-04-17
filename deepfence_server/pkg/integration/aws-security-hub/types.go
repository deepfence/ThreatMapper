package awssecurityhub

import "github.com/deepfence/ThreatMapper/deepfence_server/reporters"

type AwsSecurityHub struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
	Resource         string                  `json:"resource"`
}

type Config struct {
	AWSAccountId string `json:"aws_account_id"`
	AWSAccessKey string `json:"aws_access_key"`
	AWSSecretKey string `json:"aws_secret_key"`
	AWSRegion    string `json:"aws_region"`
}
