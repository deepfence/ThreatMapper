package teams

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/go-playground/validator/v10"
)

type Teams struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
}

type Config struct {
	WebhookURL string `json:"webhook_url" validate:"required,url" required:"true"`
}

// Payloads
type Payload struct {
	CardType   string    `json:"@type"`
	Context    string    `json:"@context"`
	Markdown   bool      `json:"markdown,bool"`
	Text       string    `json:"text,omitempty"`
	Title      string    `json:"title,omitempty"`
	Summary    string    `json:"summary,omitempty"`
	Sections   []section `json:"sections,omitempty"`
	ThemeColor string    `json:"themeColor,omitempty"`
}

func (t Teams) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(t.Config)
}

type section struct {
	Text         string `json:"text,omitempty"`
	ActivityText string `json:"activityText,omitempty"`
	StartGroup   bool   `json:"startGroup"`
	Facts        []fact `json:"facts,omitempty"`
}

type fact struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}
