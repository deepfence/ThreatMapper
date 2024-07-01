package jira

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/go-playground/validator/v10"
)

type Jira struct {
	Config           Config                  `json:"config"`
	IntegrationType  string                  `json:"integration_type"`
	NotificationType string                  `json:"notification_type"`
	Filters          reporters.FieldsFilters `json:"filters"`
	Message          string                  `json:"message"`
}

type Config struct {
	JiraSiteURL    string   `json:"jiraSiteUrl" validate:"required,url" required:"true"`
	Username       string   `json:"username" validate:"required,min=1" required:"true"`
	Password       string   `json:"password" validate:"omitempty,min=8,max=100,jira_auth_key"`
	JiraProjectKey string   `json:"jiraProjectKey" validate:"required,min=1" required:"true"`
	JiraAssignee   string   `json:"jiraAssignee" validate:"omitempty,min=1"`
	IssueType      string   `json:"issueType" validate:"required,min=1" required:"true"`
	IsAuthToken    bool     `json:"isAuthToken"`
	APIToken       string   `json:"api_token" validate:"omitempty,min=32,max=300,jira_auth_key"`
	CustomFields   []string `json:"custom_fields"`
}

func (j Jira) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(j.Config)
}
