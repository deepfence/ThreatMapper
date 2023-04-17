package googlechronicle

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/go-playground/validator/v10"
)

type GoogleChronicle struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
}

type Config struct {
	URL     string `json:"url" validate:"required,url" required:"true"`
	AuthKey string `json:"auth_header"`
}

func (g GoogleChronicle) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(g.Config)
}
