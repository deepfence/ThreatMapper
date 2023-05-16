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
	Username       string `json:"username" validate:"required" required:"true"`
	Password       string `json:"password" validate:"required" required:"true"`
	JiraProjectKey string `json:"jiraProjectKey" validate:"required" required:"true"`
	JiraAssignee   string `json:"jiraAssignee"`
	IssueType      string `json:"issueType" validate:"required" required:"true"`
	IsAuthToken    bool   `json:"isAuthToken" validate:"required" required:"true"`
	APIToken       string `json:"api_token" validate:"required" required:"true"`
}

func (j Jira) ValidateConfig(validate *validator.Validate) error {
	return validate.Struct(j.Config)
}
