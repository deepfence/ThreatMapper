package constants

const (
	ACR           = "azure_container_registry"
	DockerHub     = "docker_hub"
	DockerPrivate = "docker_private_registry"
	ECR           = "ecr"
	ECRPublic     = "ecr-public"
	GCR           = "google_container_registry"
	Gitlab        = "gitlab"
	Harbor        = "harbor"
	Jfrog         = "jfrog_container_registry"
	Quay          = "quay"
)

const (
	RedisJWTSignKey = "SERVER_JWT_SIGN_KEY"
)

var RegistryTypes = []string{
	ACR, DockerHub, DockerPrivate, ECR, GCR, Gitlab, Harbor, Jfrog, Quay,
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

	DeepfenceCommunityEmailID = "community@deepfence.io"
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
