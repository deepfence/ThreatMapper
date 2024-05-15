package email

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
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

func (e Email) FormatMessage(message []map[string]interface{}) string {
	var entiremsg strings.Builder
	entiremsg.WriteString("*")
	entiremsg.WriteString(e.Resource)
	entiremsg.WriteString("*\n\n")

	// Prepare the sorted keys so that the output has the records in same order
	var keys []string
	if len(message) > 0 {
		keys = make([]string, 0, len(message[0]))
		for key := range message[0] {
			keys = append(keys, key)
		}

		sort.Strings(keys)
	}

	for k, v := range message {
		entiremsg.WriteString("#")
		entiremsg.WriteString(strconv.Itoa(k + 1))
		entiremsg.WriteString("\n")
		for _, key := range keys {
			if val, ok := v[key]; ok {
				fmtVal := ""
				if val != nil {
					fmtVal = fmt.Sprintf("%v", val)
				}
				entiremsg.WriteString(key)
				entiremsg.WriteString(": ")
				entiremsg.WriteString(fmtVal)
				entiremsg.WriteString("\n")
				delete(v, key)
			}
		}

		// This is to handle if we have unprocessed data in the map
		// Possilbe if all the records are not uniform
		for key, val := range v {
			fmtVal := ""
			if val != nil {
				fmtVal = fmt.Sprintf("%v", val)
			}
			entiremsg.WriteString(key)
			entiremsg.WriteString(": ")
			entiremsg.WriteString(fmtVal)
			entiremsg.WriteString("\n")
		}
		entiremsg.WriteString("\n")
	}
	return entiremsg.String()
}

func (e Email) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "email-send-notification")
	defer span.End()

	// formatting : unmarshal into payload
	var msg []map[string]interface{}

	d := json.NewDecoder(strings.NewReader(message))
	d.UseNumber()
	if err := d.Decode(&msg); err != nil {
		return err
	}

	m := e.FormatMessage(msg)
	emailSender, err := sendemail.NewEmailSender(ctx)
	if err != nil {
		return err
	}
	return emailSender.Send([]string{e.Config.EmailID}, "Deepfence Subscription", m, "", nil)
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
