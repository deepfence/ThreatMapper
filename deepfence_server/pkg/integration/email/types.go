package email

import "github.com/go-playground/validator/v10"

type Email struct {
	Config           Config              `json:"config"`
	IntegrationType  string              `json:"integration_type"`
	NotificationType string              `json:"notification_type"`
	Filters          map[string][]string `json:"filters"`
	Message          string              `json:"message"`
}

type Config struct {
	EmailId string `json:"email_id"  validate:"required,email" required:"true"`
}

func (e Email) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(e.Config)
}
