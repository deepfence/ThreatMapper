package elasticsearch

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"

	intgerr "github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/errors"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

func New(ctx context.Context, b []byte) (*ElasticSearch, error) {
	p := ElasticSearch{}
	err := json.Unmarshal(b, &p)
	if err != nil {
		return &p, err
	}
	return &p, nil
}

func (e ElasticSearch) SendNotification(ctx context.Context, message []map[string]interface{}, extras map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "elasticsearch-send-notification")
	defer span.End()

	var err error

	// send messages to bulk api
	sendBulkRequest := func() error {
		payloadMsg := ""
		meta := "{\"index\":{\"_index\":\"" + e.Config.Index + "\"}}\n"
		for _, payload := range message {
			pl, err := json.Marshal(payload)
			if err != nil {
				return err
			}
			payloadMsg += meta + string(pl) + "\n"
		}
		endpointURL := strings.TrimRight(e.Config.EndpointURL, "/")
		req, err := http.NewRequest(http.MethodPost, endpointURL+"/_bulk", bytes.NewBuffer([]byte(payloadMsg)))
		if err != nil {
			log.Error().Err(err).Msg("error on create http request")
			return err
		}

		req.Header.Set("Content-Type", "application/x-ndjson")

		if e.Config.AuthHeader != "" {
			req.Header.Set("Authorization", e.Config.AuthHeader)
		}

		// Make the HTTP request.
		resp, err := utils.GetHTTPClient().Do(req)
		if err != nil {
			log.Error().Err(err).Msg("error on http request")
			return intgerr.CheckHTTPError(err)
		}
		defer resp.Body.Close()

		return intgerr.CheckResponseCode(resp, http.StatusOK)
	}
	err = sendBulkRequest()

	if err != nil {
		log.Warn().Err(err).Msg("error sending to elasticsearch using bulk api, switching to individual requests")

		// Try sending the messages individually
		endpointURL := strings.TrimRight(e.Config.EndpointURL, "/")
		postDocumentURL := fmt.Sprintf("%s/%s/_doc", endpointURL, e.Config.Index)

		postDocumentRequest := func(message map[string]interface{}) error {
			payloadMsg, err := json.Marshal(message)
			if err != nil {
				return err
			}

			req, err := http.NewRequest(http.MethodPost, postDocumentURL, bytes.NewBuffer(payloadMsg))
			if err != nil {
				log.Error().Err(err).Msg("error on create http request")
				return err
			}

			req.Header.Set("Content-Type", "application/json")

			if e.Config.AuthHeader != "" {
				req.Header.Set("Authorization", e.Config.AuthHeader)
			}

			// Make the HTTP request.
			resp, err := utils.GetHTTPClient().Do(req)
			if err != nil {
				log.Error().Err(err).Msg("error on http request")
				return intgerr.CheckHTTPError(err)
			}
			defer resp.Body.Close()

			return intgerr.CheckResponseCode(resp, http.StatusCreated)
		}

		for _, msg := range message {
			err = postDocumentRequest(msg)
			if err != nil {
				log.Error().Err(err).Msg("error sending to elasticsearch")
				span.EndWithErr(err)
				return err
			}
		}
	}
	return nil
}

func (e ElasticSearch) IsValidCredential(ctx context.Context) (bool, error) {
	// url might have trailing slash, remove it
	url := strings.TrimRight(e.Config.EndpointURL, "/")
	// Construct the URL for the Elasticsearch index
	url = fmt.Sprintf("%s/%s", url, e.Config.Index)

	// Send a HEAD request to check if the index exists
	req, err := http.NewRequest(http.MethodHead, url, nil)
	if err != nil {
		return false, err
	}

	if e.Config.AuthHeader != "" {
		req.Header.Set("Authorization", e.Config.AuthHeader)
	}

	resp, err := utils.GetHTTPClient().Do(req)
	if err != nil {
		log.Error().Msgf("Error connecting to Elasticsearch: %v", err)
		return false, fmt.Errorf("error connecting to Elasticsearch: %v", err)
	}
	defer resp.Body.Close()

	// Check the status code
	if resp.StatusCode != http.StatusOK {
		log.Error().Msgf("elasticsearch index validation failed. Status code: %d", resp.StatusCode)
		return false, fmt.Errorf("elasticsearch index validation failed. Status code: %d", resp.StatusCode)
	}

	return true, nil
}

func (e ElasticSearch) SendSummaryLink() bool {
	return false
}
