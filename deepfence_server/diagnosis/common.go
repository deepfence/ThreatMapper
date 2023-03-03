package diagnosis

type DiagnosticNotification struct {
	Content             string      `json:"content"`
	ExpiryInSecs        interface{} `json:"expiry_in_secs"`
	FollowURL           interface{} `json:"follow_url"`
	SourceApplicationID string      `json:"source_application_id"`
	UpdatedAt           string      `json:"updated_at"`
}

type GenerateDiagnosticLogsRequest struct {
	Tail int `json:"tail" validate:"required,min=100,max=10000" required:"true"`
}
