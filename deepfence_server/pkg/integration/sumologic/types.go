package sumologic

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/go-playground/validator/v10"
)

type SumoLogic struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
}

type Config struct {
	HTTPEndpoint string `json:"endpoint_url" validate:"required,url" required:"true"`
}

func (s SumoLogic) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(s.Config)
}
