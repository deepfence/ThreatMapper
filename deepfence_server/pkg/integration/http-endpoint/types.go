package httpendpoint

import "github.com/deepfence/ThreatMapper/deepfence_server/reporters"

type HTTPEndpoint struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
}

type Config struct {
	URL     string `json:"url"`
	AuthKey string `json:"auth_key"`
}
