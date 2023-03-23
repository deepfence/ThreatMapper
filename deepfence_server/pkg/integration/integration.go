package integration

import (
	"errors"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/slack"
)

// GetIntegration returns an integration object based on the integration type
func GetIntegration(integrationType string, b []byte) (Integration, error) {
	switch integrationType {
	case "slack":
		return slack.New(b)
	default:
		return nil, errors.New("invalid integration type")
	}
}

// Integration is the interface for all integrations
type Integration interface {
	SendNotification(message string) error
}
