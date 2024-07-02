package email

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/sendemail"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
)

// BatchSize todo: add support for batch size
const BatchSize = 100

func New(ctx context.Context, b []byte) (*Email, error) {
	h := Email{}
	err := json.Unmarshal(b, &h)
	if err != nil {
		return &h, err
	}

	// check if email is configured, donot allow if not
	if !h.IsEmailConfigured(ctx) {
		return nil, fmt.Errorf("not configured to send emails. Please configure it in Settings->Email Configuration")
	}

	return &h, nil
}

func (e Email) FormatMessage(message []map[string]interface{},
	extras map[string]interface{}) (string, map[string][]byte) {

	var msg strings.Builder
	var attachments = map[string][]byte{}

	for k, v := range extras {
		if v != "" {
			if k == "severity_counts" {
				s := ""
				for i, j := range v.(map[string]int32) {
					s = fmt.Sprintf("   %s: %d\r\n", i, j)
				}
				msg.WriteString(fmt.Sprintf("%s:\r\n%s", k, s))
			} else {
				msg.WriteString(fmt.Sprintf("%s: %v\r\n", k, v))
			}
		}
	}

	r, err := json.Marshal(message)
	if err != nil {
		log.Error().Err(err).Msg("failed to marshal results")
	}

	attachments["scan-results.json"] = r

	return msg.String(), attachments
}

func (e Email) SendNotification(ctx context.Context,
	message []map[string]interface{}, extras map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "email-send-notification")
	defer span.End()

	m, a := e.FormatMessage(message, extras)
	emailSender, err := sendemail.NewEmailSender(ctx)
	if err != nil {
		return err
	}
	return emailSender.Send([]string{e.Config.EmailID},
		fmt.Sprintf("Deepfence %s Subscription", e.Resource), m, "", a)
}

func (e Email) IsEmailConfigured(ctx context.Context) bool {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("unable to get postgres client: %v", err)
		return false
	}
	setting, err := pgClient.GetSetting(ctx, model.EmailConfigurationKey)
	if errors.Is(err, sql.ErrNoRows) {
		return false
	} else if err != nil {
		log.Error().Msgf("unable to get email configuration: %v", err)
		return false
	}
	var emailConfig model.EmailConfigurationResp
	err = json.Unmarshal(setting.Value, &emailConfig)
	if err != nil {
		log.Error().Msgf("unable to unmarshal email configuration: %v", err)
		return false
	}

	return true
}

// In case of email basic validation and regex check should be enough
func (e Email) IsValidCredential(ctx context.Context) (bool, error) {
	return true, nil
}

func (e Email) SendSummaryLink() bool {
	return e.Config.SendSummary
}
