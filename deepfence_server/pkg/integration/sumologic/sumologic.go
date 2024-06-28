package sumologic

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"

	intgerr "github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/errors"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

func New(ctx context.Context, b []byte) (SumoLogic, error) {
	var s SumoLogic
	err := json.Unmarshal(b, &s)
	if err != nil {
		return s, err
	}
	if s.Config.HTTPEndpoint == "" {
		return s, errors.New("invalid Sumo Logic configuration")
	}
	return s, nil
}

func (s SumoLogic) FormatMessage(message []map[string]interface{}) (bytes.Buffer, error) {
	var buffer bytes.Buffer
	for _, v := range message {
		b, err := json.Marshal(v)
		if err != nil {
			log.Error().Msgf("%v", err)
			return buffer, err
		}
		buffer.Write(b)
		buffer.WriteString("\n")
	}
	return buffer, nil
}

func (s SumoLogic) SendNotification(ctx context.Context, data []map[string]interface{}, extra map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "sumologic-send-notification")
	defer span.End()

	// Create an HTTP client with a timeout
	client := utils.GetHTTPClient()

	msg, err := s.FormatMessage(data)
	if err != nil {
		log.Error().Msgf("%v", err)
		return err
	}

	// Create a new request to send the JSON data to Sumo Logic
	req, err := http.NewRequest(http.MethodPost, s.Config.HTTPEndpoint, bytes.NewBuffer(msg.Bytes()))
	if err != nil {
		log.Error().Msgf("Failed to create HTTP request: %v", err)
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	// Send the request to Sumo Logic
	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msgf("Failed to send data to Sumo Logic: %v", err)
		return intgerr.CheckHTTPError(err)
	}
	defer resp.Body.Close()

	return intgerr.CheckResponseCode(resp, http.StatusOK)
}

// todo
func (s SumoLogic) IsValidCredential(ctx context.Context) (bool, error) {
	return true, nil
}

func (a SumoLogic) SendSummaryLink() bool {
	return false
}
