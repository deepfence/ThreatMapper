package sumologic

import "github.com/deepfence/ThreatMapper/deepfence_server/reporters"

type SumoLogic struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
}

type Config struct {
	HTTPEndpoint string `json:"http_endpoint"`
}
