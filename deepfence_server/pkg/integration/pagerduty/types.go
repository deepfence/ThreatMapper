package pagerduty

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/go-playground/validator/v10"
)

type PagerDuty struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
}

type Config struct {
	ServiceKey string `json:"service_key" validate:"required" required:"true"`
	APIKey     string `json:"api_key" validate:"required" required:"true"`
}

func (p PagerDuty) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(p.Config)
}
