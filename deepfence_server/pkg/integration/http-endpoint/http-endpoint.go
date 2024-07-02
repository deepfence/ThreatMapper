package httpendpoint

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"

	intgerr "github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/errors"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

// todo: add support for batch size
const BatchSize = 100

func New(ctx context.Context, b []byte) (*HTTPEndpoint, error) {
	h := HTTPEndpoint{}
	err := json.Unmarshal(b, &h)
	if err != nil {
		return &h, err
	}
	return &h, nil
}

func (h HTTPEndpoint) SendNotification(ctx context.Context, message []map[string]interface{}, extras map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "http-endpoiint-send-notification")
	defer span.End()

	var req *http.Request
	var err error

	payload, err := json.Marshal(message)
	if err != nil {
		log.Error().Err(err).Msg("failed to marshal message")
		return err
	}

	// send message to this http url using http
	// Set up the HTTP request.
	req, err = http.NewRequest(http.MethodPost, h.Config.URL, bytes.NewBuffer(payload))
	if err != nil {
		log.Error().Err(err).Msg("error on create http request")
		span.EndWithErr(err)
		return err
	}

	if h.Config.AuthHeader != "" {
		req.Header.Set("Authorization", h.Config.AuthHeader)
	}

	req.Header.Set("Content-Type", "application/json")

	// Make the HTTP request.
	client := utils.GetHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		log.Error().Err(err).Msg("error on http request")
		span.EndWithErr(err)
		return intgerr.CheckHTTPError(err)
	}
	defer resp.Body.Close()

	return intgerr.CheckResponseCode(resp, http.StatusOK)
}

func (h HTTPEndpoint) IsValidCredential(ctx context.Context) (bool, error) {
	// send test message to http endpoint
	payload := map[string]interface{}{
		"text": "Test message from Deepfence",
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return false, nil
	}

	// send message to this http url using http
	// Set up the HTTP request.
	req, err := http.NewRequest("POST", h.Config.URL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Error().Err(err).Msg("error on create http request")
		return false, nil
	}

	if h.Config.AuthHeader != "" {
		req.Header.Set("Authorization", h.Config.AuthHeader)
	}

	req.Header.Set("Content-Type", "application/json")

	// Make the HTTP request.
	client := utils.GetHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		log.Error().Err(err).Msg("error on http request")
		return false, err
	}
	defer resp.Body.Close()

	// Check the response status code.
	return resp.StatusCode == http.StatusOK, nil
}

func (h HTTPEndpoint) SendSummaryLink() bool {
	return false
}
