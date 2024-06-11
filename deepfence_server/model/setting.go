package model

const (
	EmailConfigurationKey = "email_configuration"
	EmailSettingSES       = "amazon_ses"
	EmailSettingSMTP      = "smtp"
	EmailSettingSendGrid  = "sendgrid"
)

type GetAuditLogsRequest struct {
	Window FetchWindow `json:"window"  required:"true"`
}

type GetAgentBinaryDownloadURLResponse struct {
	AgentBinaryAmd64DownloadURL     string `json:"agent_binary_amd64_download_url"`
	AgentBinaryArm64DownloadURL     string `json:"agent_binary_arm64_download_url"`
	StartAgentScriptDownloadURL     string `json:"start_agent_script_download_url"`
	UninstallAgentScriptDownloadURL string `json:"uninstall_agent_script_download_url"`
}
