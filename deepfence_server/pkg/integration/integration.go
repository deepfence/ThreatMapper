package integration

import (
	"context"
	"errors"

	"github.com/go-playground/validator/v10"

	awssecurityhub "github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/aws-security-hub"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/elasticsearch"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/email"
	googlechronicle "github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/google-chronicle"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	httpendpoint "github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/http-endpoint"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/jira"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/pagerduty"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/s3"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/slack"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/splunk"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/teams"
)

// GetIntegration returns an integration object based on the integration type
func GetIntegration(integrationType string, b []byte) (Integration, error) {
	switch integrationType {
	case constants.Slack:
		return slack.New(b)
	case constants.HTTP:
		return httpendpoint.New(b)
	case constants.Teams:
		return teams.New(b)
	case constants.PagerDuty:
		return pagerduty.New(b)
	case constants.S3:
		return s3.New(b)
	case constants.Splunk:
		return splunk.New(b)
	case constants.ElasticSearch:
		return elasticsearch.New(b)
	case constants.GoogleChronicle:
		return googlechronicle.New(b)
	case constants.AwsSecurityHub:
		return awssecurityhub.New(b)
	case constants.Email:
		return email.New(b)
	case constants.Jira:
		return jira.New(b)
	default:
		return nil, errors.New("invalid integration type")
	}
}

// Integration is the interface for all integrations
type Integration interface {
	// extras are additional fields that are not part of the message
	SendNotification(ctx context.Context, message string, extras map[string]interface{}) error
	ValidateConfig(*validator.Validate) error
}
