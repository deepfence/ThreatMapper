package model

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
)

var (
	AiIntegrationTypeLabel = map[string]string{
		constants.OpenAI:  "OpenAI",
		constants.Bedrock: "Amazon Bedrock",
	}
)

const (
	GenerativeAiIntegrationExitMessage = "[DEEPFENCE_DONE]"

	CloudPostureQuery      = "cloud_posture"
	LinuxPostureQuery      = "linux_posture"
	KubernetesPostureQuery = "kubernetes_posture"
	VulnerabilityQuery     = "vulnerability"
	SecretQuery            = "secret"
	MalwareQuery           = "malware"

	QueryTypeRemediation = "remediation"
)

type GenerativeAiIntegrationMessageResponse struct {
	Content      string `json:"content"`
	FinishReason string `json:"finish_reason"`
}

type GenerativeAiIntegrationRequest interface {
	GetRequestType() string
	GetFields() interface{}
	GetIntegrationID() int32
	GetQueryType() string
}

type GenerativeAiIntegrationRequestCommon struct {
	IntegrationID int32  `json:"integration_id"`
	QueryType     string `json:"query_type" validate:"required,oneof=remediation" required:"true" enum:"remediation"`
}

func (a GenerativeAiIntegrationRequestCommon) GetIntegrationID() int32 {
	return a.IntegrationID
}

func (a GenerativeAiIntegrationRequestCommon) GetQueryType() string {
	return a.QueryType
}

type GenerativeAiIntegrationCloudPostureRequest struct {
	GenerativeAiIntegrationRequestCommon
	RemediationFormat   string `json:"remediation_format" validate:"required,oneof=all cli pulumi terraform" required:"true" enum:"all,cli,pulumi,terraform"`
	Group               string `json:"group"`
	Service             string `json:"service"`
	Title               string `json:"title" validate:"required" required:"true"`
	ComplianceCheckType string `json:"compliance_check_type" validate:"required" required:"true"`
	CloudProvider       string `json:"cloud_provider" validate:"required" required:"true"`
}

func (a GenerativeAiIntegrationCloudPostureRequest) GetFields() interface{} {
	return a
}

func (a GenerativeAiIntegrationCloudPostureRequest) GetRequestType() string {
	return CloudPostureQuery
}

type GenerativeAiIntegrationLinuxPostureRequest struct {
	GenerativeAiIntegrationRequestCommon
	RemediationFormat   string `json:"remediation_format" validate:"required,oneof=all cli pulumi terraform" required:"true" enum:"all,cli,pulumi,terraform"`
	Description         string `json:"description" validate:"required" required:"true"`
	TestNumber          string `json:"test_number" validate:"required" required:"true"`
	ComplianceCheckType string `json:"compliance_check_type" validate:"required" required:"true"`
}

func (a GenerativeAiIntegrationLinuxPostureRequest) GetFields() interface{} {
	return a
}

func (a GenerativeAiIntegrationLinuxPostureRequest) GetRequestType() string {
	return LinuxPostureQuery
}

type GenerativeAiIntegrationKubernetesPostureRequest struct {
	GenerativeAiIntegrationRequestCommon
	RemediationFormat   string `json:"remediation_format" validate:"required,oneof=all cli pulumi terraform" required:"true" enum:"all,cli,pulumi,terraform"`
	Description         string `json:"description" validate:"required" required:"true"`
	ComplianceCheckType string `json:"compliance_check_type" validate:"required" required:"true"`
}

func (a GenerativeAiIntegrationKubernetesPostureRequest) GetFields() interface{} {
	return a
}

func (a GenerativeAiIntegrationKubernetesPostureRequest) GetRequestType() string {
	return KubernetesPostureQuery
}

type GenerativeAiIntegrationVulnerabilityRequest struct {
	GenerativeAiIntegrationRequestCommon
	RemediationFormat  string `json:"remediation_format" validate:"required,oneof=all cli pulumi terraform" required:"true" enum:"all,cli,pulumi,terraform"`
	CveID              string `json:"cve_id" validate:"required" required:"true"`
	CveType            string `json:"cve_type" validate:"required" required:"true"`
	CveCausedByPackage string `json:"cve_caused_by_package" validate:"required" required:"true"`
}

func (a GenerativeAiIntegrationVulnerabilityRequest) GetFields() interface{} {
	return a
}

func (a GenerativeAiIntegrationVulnerabilityRequest) GetRequestType() string {
	return VulnerabilityQuery
}

type GenerativeAiIntegrationSecretRequest struct {
	GenerativeAiIntegrationRequestCommon
	Name string `json:"name" validate:"required" required:"true"`
}

func (a GenerativeAiIntegrationSecretRequest) GetFields() interface{} {
	return a
}

func (a GenerativeAiIntegrationSecretRequest) GetRequestType() string {
	return SecretQuery
}

type GenerativeAiIntegrationMalwareRequest struct {
	GenerativeAiIntegrationRequestCommon
	RuleName string `json:"rule_name" validate:"required" required:"true"`
	Info     string `json:"info" validate:"required" required:"true"`
}

func (a GenerativeAiIntegrationMalwareRequest) GetFields() interface{} {
	return a
}

func (a GenerativeAiIntegrationMalwareRequest) GetRequestType() string {
	return MalwareQuery
}

type AddGenerativeAiIntegrationRequest interface {
	GetIntegrationType() string
	GetFields() interface{}
	GetLabel() string
	IntegrationExists(context.Context, *postgresqlDb.Queries) (bool, error)
}

type AddGenerativeAiOpenAIIntegration struct {
	APIKey  string `json:"api_key" validate:"required" required:"true"`
	ModelID string `json:"model_id" validate:"required,oneof=gpt-4" required:"true" enum:"gpt-4"`
}

func (a AddGenerativeAiOpenAIIntegration) GetIntegrationType() string {
	return constants.OpenAI
}

func (a AddGenerativeAiOpenAIIntegration) GetFields() interface{} {
	return a
}

func (a AddGenerativeAiOpenAIIntegration) GetLabel() string {
	return AiIntegrationTypeLabel[constants.OpenAI] + " (" + a.ModelID + ")"
}

func (a AddGenerativeAiOpenAIIntegration) IntegrationExists(ctx context.Context, pgClient *postgresqlDb.Queries) (bool, error) {
	count, err := pgClient.CountGenerativeAiIntegrationByLabel(ctx, a.GetLabel())
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

type AddGenerativeAiBedrockIntegration struct {
	AWSAccessKey string `json:"aws_access_key" validate:"omitempty,min=16,max=128"`
	AWSSecretKey string `json:"aws_secret_key" validate:"omitempty,min=16,max=128"`
	AWSRegion    string `json:"aws_region" validate:"required,oneof=us-east-1 us-east-2 us-west-1 us-west-2 af-south-1 ap-east-1 ap-south-1 ap-northeast-1 ap-northeast-2 ap-northeast-3 ap-southeast-1 ap-southeast-2 ap-southeast-3 ca-central-1 eu-central-1 eu-west-1 eu-west-2 eu-west-3 eu-south-1 eu-north-1 me-south-1 me-central-1 sa-east-1 us-gov-east-1 us-gov-west-1" required:"true" enum:"us-east-1,us-east-2,us-west-1,us-west-2,af-south-1,ap-east-1,ap-south-1,ap-northeast-1,ap-northeast-2,ap-northeast-3,ap-southeast-1,ap-southeast-2,ap-southeast-3,ca-central-1,eu-central-1,eu-west-1,eu-west-2,eu-west-3,eu-south-1,eu-north-1,me-south-1,me-central-1,sa-east-1,us-gov-east-1,us-gov-west-1"`
	UseIAMRole   bool   `json:"use_iam_role"`
	ModelID      string `json:"model_id" validate:"required,oneof=anthropic.claude-v2 anthropic.claude-instant-v1 amazon.titan-text-lite-v1 amazon.titan-text-express-v1 ai21.j2-ultra-v1 ai21.j2-mid-v1 meta.llama2-13b-chat-v1 cohere.command-text-v14 cohere.command-light-text-v14" required:"true" enum:"anthropic.claude-v2,anthropic.claude-instant-v1,amazon.titan-text-lite-v1,amazon.titan-text-express-v1,ai21.j2-ultra-v1,ai21.j2-mid-v1,meta.llama2-13b-chat-v1,cohere.command-text-v14,cohere.command-light-text-v14"`
}

func (a AddGenerativeAiBedrockIntegration) GetIntegrationType() string {
	return constants.Bedrock
}

func (a AddGenerativeAiBedrockIntegration) GetFields() interface{} {
	return a
}

func (a AddGenerativeAiBedrockIntegration) GetLabel() string {
	return AiIntegrationTypeLabel[constants.Bedrock] + " (" + a.ModelID + ")"
}

func (a AddGenerativeAiBedrockIntegration) IntegrationExists(ctx context.Context, pgClient *postgresqlDb.Queries) (bool, error) {
	count, err := pgClient.CountGenerativeAiIntegrationByLabel(ctx, a.GetLabel())
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

type GenerativeAiIntegrationListRequest struct {
	IntegrationType string `query:"integration_type" validate:"omitempty,oneof=openai amazon-bedrock" enum:"openai,amazon-bedrock"`
}

type GenerativeAiIntegrationListResponse struct {
	ID                 int32  `json:"id"`
	IntegrationType    string `json:"integration_type"`
	Label              string `json:"label"`
	LastErrorMsg       string `json:"last_error_msg"`
	DefaultIntegration bool   `json:"default_integration"`
}
