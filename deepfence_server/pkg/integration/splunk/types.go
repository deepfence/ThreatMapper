package splunk

import (
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/go-playground/validator/v10"
)

type Splunk struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
	client           *http.Client
}

type Config struct {
	EndpointURL string `json:"endpoint_url" validate:"required,url" required:"true"`
	Token       string `json:"token" validate:"required,min=1" required:"true"`
}

func (s Splunk) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(s.Config)
}
