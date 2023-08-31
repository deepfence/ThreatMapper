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
	JiraSiteUrl    string `json:"jiraSiteUrl" validate:"required,url" required:"true"`
	Username       string `json:"username" validate:"required,email" required:"true"`
	Password       string `json:"password" validate:"omitempty,min=8,max=100,jira_auth_key"`
	JiraProjectKey string `json:"jiraProjectKey" validate:"required,min=1" required:"true"`
	JiraAssignee   string `json:"jiraAssignee"`
	IssueType      string `json:"issueType" validate:"required,min=1" required:"true"`
	IsAuthToken    bool   `json:"isAuthToken" validate:"required" required:"true"`
	APIToken       string `json:"api_token" validate:"omitempty,min=32,max=300,jira_auth_key"`
}

func (j Jira) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(j.Config)
}
