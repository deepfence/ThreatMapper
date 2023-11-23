package constants

const (
	ACR            = "azure_container_registry"
	DOCKER_HUB     = "docker_hub"
	DOCKER_PRIVATE = "docker_private_registry"
	ECR            = "ecr"
	ECR_PUBLIC     = "ecr-public"
	GCR            = "google_container_registry"
	GITLAB         = "gitlab"
	HARBOR         = "harbor"
	JFROG          = "jfrog_container_registry"
	QUAY           = "quay"
)

const (
	REDIS_JWT_SIGN_KEY = "SERVER_JWT_SIGN_KEY"
)

var RegistryTypes = []string{
	ACR, DOCKER_HUB, DOCKER_PRIVATE, ECR, GCR, GITLAB, HARBOR, JFROG, QUAY,
}

// AiIntegration related consts
const (
	OpenAI  = "openai"
	Bedrock = "amazon-bedrock"
)

// Integration related consts
const (
	Slack           = "slack"
	HTTP            = "http_endpoint"
	Teams           = "teams"
	Splunk          = "splunk"
	S3              = "s3"
	PagerDuty       = "pagerduty"
	ElasticSearch   = "elasticsearch"
	GoogleChronicle = "googlechronicle"
	AwsSecurityHub  = "aws_security_hub"
	Email           = "email"
	Jira            = "jira"
	SumoLogic       = "sumologic"
)

const (
	Password       = "password"
	WebhookURL     = "webhook_url"
	IntegrationKey = "integration_key"
	APIKey         = "api_key"

	DeepfenceCommunityEmailId = "community@deepfence.io"
)

var SensitiveFields = map[string]struct{}{
	Password:       {},
	WebhookURL:     {},
	IntegrationKey: {},
	APIKey:         {},
}

const (
	RedisKeyPostureProviders = "PostureProviders"
)
