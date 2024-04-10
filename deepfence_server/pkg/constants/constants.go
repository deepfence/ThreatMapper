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
	PasswordFieldKey       = "password"
	WebhookURLFieldKey     = "webhook_url"
	IntegrationKeyFieldKey = "integration_key"
	APIKeyFieldKey         = "api_key"
	SecretKeyFieldKey      = "aws_secret_key"
	AuthHeaderFieldKey     = "auth_header"
	APITokenFieldKey       = "api_token"
	ServiceKeyFieldKey     = "service_key"
	TokenFieldKey          = "token"

	DeepfenceCommunityEmailID = "community@deepfence.io"
)

var SensitiveFields = map[string]struct{}{
	PasswordFieldKey:       {},
	WebhookURLFieldKey:     {},
	IntegrationKeyFieldKey: {},
	APIKeyFieldKey:         {},
	SecretKeyFieldKey:      {},
	AuthHeaderFieldKey:     {},
	APITokenFieldKey:       {},
	ServiceKeyFieldKey:     {},
	TokenFieldKey:          {},
}

const (
	RedisKeyPostureProviders = "PostureProviders"
)
