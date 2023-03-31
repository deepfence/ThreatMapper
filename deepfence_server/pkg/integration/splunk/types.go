package splunk

type Splunk struct {
	Config           Config              `json:"config"`
	IntegrationType  string              `json:"integration_type"`
	NotificationType string              `json:"notification_type"`
	Filters          map[string][]string `json:"filters"`
	Message          string              `json:"message"`
}

type Config struct {
	EndpointURL string `json:"endpoint_url"`
	Token       string `json:"token"`
}
