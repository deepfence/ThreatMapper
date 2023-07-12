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
	Resource         string                  `json:"resource"`
	Severity         string                  `json:"severity"`
}

type Config struct {
	ServiceKey string `json:"service_key" validate:"required,min=1" required:"true"`
	APIKey     string `json:"api_key" validate:"required,min=1" required:"true"`
}

type PagerDutyEvent struct {
	RoutingKey  string                 `json:"routing_key"`
	EventAction string                 `json:"event_action"`
	Payload     map[string]interface{} `json:"payload"`
}

func (p PagerDuty) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(p.Config)
}
