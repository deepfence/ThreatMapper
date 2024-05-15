package httpendpoint

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"

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

func (h HTTPEndpoint) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "http-endpoiint-send-notification")
	defer span.End()

	var req *http.Request
	var err error

	payloadBytes := []byte(message)

	// send message to this http url using http
	// Set up the HTTP request.
	req, err = http.NewRequest("POST", h.Config.URL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		span.EndWithErr(err)
		return err
	}

	if h.Config.AuthHeader != "" {
		req.Header.Set("Authorization", h.Config.AuthHeader)
	}

	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	// Make the HTTP request.
	client := utils.GetHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		span.EndWithErr(err)
		return err
	}
	defer resp.Body.Close()

	// Check the response status code.
	if resp.StatusCode != http.StatusOK {
		return err
	}

	return nil
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
		return false, err
	}
	defer resp.Body.Close()

	// Check the response status code.
	return resp.StatusCode == http.StatusOK, nil
}
