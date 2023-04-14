package pagerduty

import "github.com/deepfence/ThreatMapper/deepfence_server/reporters"

type PagerDuty struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
}

type Config struct {
	ServiceKey string `json:"service_key"`
	APIKey     string `json:"api_key"`
}
