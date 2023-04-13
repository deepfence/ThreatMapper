package jira

type Jira struct {
	Config           Config              `json:"config"`
	IntegrationType  string              `json:"integration_type"`
	NotificationType string              `json:"notification_type"`
	Filters          map[string][]string `json:"filters"`
	Message          string              `json:"message"`
}

type Config struct {
	JiraSiteUrl    string `json:"jiraSiteUrl"`
	Username       string `json:"username"`
	Password       string `json:"password"`
	JiraProjectKey string `json:"jiraProjectKey"`
	JiraAssignee   string `json:"jiraAssignee"`
	IssueType      string `json:"issueType"`
	IsAuthToken    bool   `json:"isAuthToken"`
	APIToken       string `json:"api_token"`
}
