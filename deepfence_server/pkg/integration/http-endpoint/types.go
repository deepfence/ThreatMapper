package httpendpoint

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/go-playground/validator/v10"
)

type HTTPEndpoint struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
}

type Config struct {
	URL        string `json:"url" validate:"required,url" required:"true"`
	AuthHeader string `json:"auth_header"`
}

func (h HTTPEndpoint) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(h.Config)
}
