package model

import (
	"time"
)

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

type DeepfenceCommunicationID struct {
	ID int64 `path:"id"`
}

type DeepfenceCommunication struct {
	ID            int64     `json:"id"`
	Title         string    `json:"title"`
	Content       string    `json:"content"`
	Link          string    `json:"link"`
	LinkTitle     string    `json:"link_title"`
	ButtonContent string    `json:"button_content"`
	Read          bool      `json:"read"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
