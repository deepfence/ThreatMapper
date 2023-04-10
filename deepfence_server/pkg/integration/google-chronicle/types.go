package googlechronicle

type GoogleChronicle struct {
	Config           Config              `json:"config"`
	IntegrationType  string              `json:"integration_type"`
	NotificationType string              `json:"notification_type"`
	Filters          map[string][]string `json:"filters"`
	Message          string              `json:"message"`
}

type Config struct {
	URL     string `json:"url"`
	AuthKey string `json:"auth_header"`
}
