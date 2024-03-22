package pagerduty

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/PagerDuty/go-pagerduty"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

const (
	pagerDutyAPIEndpoint = "https://events.pagerduty.com/v2/enqueue"
	url                  = "https://api.pagerduty.com/services?include[]=integrations"
	BatchSize            = 100
)

var pagerdutySeverityMapping = map[string]string{
	"critical": "critical",
	"high":     "error",
	"medium":   "warning",
	"low":      "info",
	"info":     "info",
}

func New(ctx context.Context, b []byte) (*PagerDuty, error) {
	p := PagerDuty{}
	err := json.Unmarshal(b, &p)
	if err != nil {
		return &p, err
	}
	return &p, nil
}

func (p PagerDuty) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "pagerduty-send-notification")
	defer span.End()

	if p.Config.APIKey == "" {
		log.Error().Msg("API key is empty")
		return nil
	}

	if p.Config.ServiceKey == "" {
		log.Error().Msg("Service key is empty")
		return nil
	}

	var err error
	var msg []map[string]interface{}
	d := json.NewDecoder(strings.NewReader(message))
	d.UseNumber()
	if err = d.Decode(&msg); err != nil {
		return err
	}
	m := p.FormatMessage(msg)

	sev := pagerdutySeverityMapping[p.Severity]
	if sev == "" {
		sev = "info"
	}

	incident := pagerduty.V2Event{
		RoutingKey: p.Config.ServiceKey,
		Action:     "trigger",
		Payload: &pagerduty.V2Payload{
			Summary:  fmt.Sprintf("Deepfence - %s Subscription", p.Resource),
			Source:   "deepfence",
			Severity: sev,
			Details: map[string]string{
				"alert": m,
			},
		},
	}

	err = createPagerDutyEvent(p.Config.APIKey, incident)
	if err != nil {
		log.Error().Msgf("PagerDuty: %+v", err)
		span.EndWithErr(err)
	}
	return nil
}

func createPagerDutyEvent(pagerDutyAPIToken string, event pagerduty.V2Event) error {
	payloadBytes, err := json.Marshal(event)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, pagerDutyAPIEndpoint, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Token token="+pagerDutyAPIToken)

	client := utils.GetHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("unexpected response status: %s", resp.Status)
	}

	return nil
}

func (p PagerDuty) FormatMessage(message []map[string]interface{}) string {
	var msg strings.Builder
	count := 1

	for _, m := range message {
		msg.WriteString(p.Resource)
		msg.WriteString(" #")
		msg.WriteString(strconv.Itoa(count))
		msg.WriteString("\n")
		for k, v := range m {
			msg.WriteString(k)
			msg.WriteString(fmt.Sprintf(": %v\n", v))
		}
		msg.WriteString("\n\n")
		count++
	}
	return msg.String()
}

// todo: implement this and make this method as part of the interface
// function that checks if the credential provided by the user is valid or not
func IsValidCreds(p PagerDuty) (bool, error) {
	var req *http.Request
	var err error

	req, err = http.NewRequest("POST", url, nil)
	if err != nil {
		return false, err
	}

	req.Header.Set("Authorization", "Token token="+p.Config.APIKey)
	req.Header.Set("Accept", "application/vnd.pagerduty+json;version=2")
	req.Header.Set("Content-Type", "application/json")

	// Make the HTTP request.
	client := utils.GetHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return true, nil
	}
	// todo: check response body for error message like invalid api key or something
	return false, nil
}

// todo
func (p PagerDuty) IsValidCredential(ctx context.Context) (bool, error) {
	return true, nil
}
