package googlechronicle

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

func New(ctx context.Context, b []byte) (*GoogleChronicle, error) {
	p := GoogleChronicle{}
	err := json.Unmarshal(b, &p)
	if err != nil {
		return &p, err
	}
	return &p, nil
}

func (g GoogleChronicle) SendNotification(ctx context.Context, message []map[string]interface{}, extras map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "google-chronicle-send-notification")
	defer span.End()

	var req *http.Request
	var err error

	payload, err := json.Marshal(message)
	if err != nil {
		log.Error().Err(err).Msg("failed to marshal message")
		return err
	}

	req, err = http.NewRequest("POST", g.Config.URL, bytes.NewBuffer(payload))
	if err != nil {
		log.Error().Err(err).Msg("error on create http request")
		span.EndWithErr(err)
		return err
	}

	if g.Config.AuthKey != "" {
		req.Header.Set("Authorization", g.Config.AuthKey)
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

// todo
func (g GoogleChronicle) IsValidCredential(ctx context.Context) (bool, error) {
	return true, nil
}

func (a GoogleChronicle) SendSummaryLink() bool {
	return false
}
