package slack

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/go-playground/validator/v10"
)

type Slack struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
	Resource         string                  `json:"resource"`
}

func (s Slack) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(s.Config)
}

type Config struct {
	WebhookURL  string `json:"webhook_url" validate:"required,url" required:"true"`
	Channel     string `json:"channel" validate:"required,min=1" required:"true"`
	SendSummary bool   `json:"send_summary"`
}

type Payload struct {
	Parse       string `json:"parse,omitempty"`
	Username    string `json:"username,omitempty"`
	IconURL     string `json:"icon_url,omitempty"`
	IconEmoji   string `json:"icon_emoji,omitempty"`
	Channel     string `json:"channel,omitempty"`
	Text        string `json:"text,omitempty"`
	LinkNames   string `json:"link_names,omitempty"`
	UnfurlLinks bool   `json:"unfurl_links,omitempty"`
	UnfurlMedia bool   `json:"unfurl_media,omitempty"`
	Markdown    bool   `json:"mrkdwn,omitempty"`
}
