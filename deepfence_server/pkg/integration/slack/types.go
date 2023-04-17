package slack

import "github.com/deepfence/ThreatMapper/deepfence_server/reporters"

type Slack struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
}

type Config struct {
	WebhookURL string `json:"webhook_url"`
	Channel    string `json:"channel"`
}

type Payload struct {
	Parse       string `json:"parse,omitempty"`
	Username    string `json:"username,omitempty"`
	IconUrl     string `json:"icon_url,omitempty"`
	IconEmoji   string `json:"icon_emoji,omitempty"`
	Channel     string `json:"channel,omitempty"`
	Text        string `json:"text,omitempty"`
	LinkNames   string `json:"link_names,omitempty"`
	UnfurlLinks bool   `json:"unfurl_links,omitempty"`
	UnfurlMedia bool   `json:"unfurl_media,omitempty"`
	Markdown    bool   `json:"mrkdwn,omitempty"`
}
