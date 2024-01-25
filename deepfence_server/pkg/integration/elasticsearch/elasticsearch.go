package elasticsearch

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"

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

func (e ElasticSearch) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {
	var req *http.Request
	var err error
	var msg []map[string]interface{}
	d := json.NewDecoder(strings.NewReader(message))
	d.UseNumber()
	if err := d.Decode(&msg); err != nil {
		return err
	}

	payloadMsg := ""
	meta := "{\"index\":{\"_index\":\"" + e.Config.Index + "\"}}\n"
	for _, payload := range msg {
		pl, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		payloadMsg += meta + string(pl) + "\n"
	}

	// send message to this elasticsearch using http
	// Set up the HTTP request.
	req, err = http.NewRequest("POST", e.Config.EndpointURL+"/_bulk", bytes.NewBuffer([]byte(payloadMsg)))
	if err != nil {
		return err
	}

	if e.Config.AuthHeader != "" {
		req.Header.Set("Authorization", e.Config.AuthHeader)
	}

	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-ndjson")

	// Make the HTTP request.
	client := utils.GetHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Check the response status code.
	if resp.StatusCode != http.StatusOK {
		return err
	}

	return nil
}

func (e ElasticSearch) IsValidCredential(ctx context.Context) bool {
	// Construct the URL for the Elasticsearch index
	url := fmt.Sprintf("%s/%s", e.Config.EndpointURL, e.Config.Index)

	// Send a HEAD request to check if the index exists
	resp, err := http.Head(url)
	if err != nil {
		log.Error().Msgf("Error connecting to Elasticsearch: %v", err)
		return false
	}
	defer resp.Body.Close()

	// Check the status code
	if resp.StatusCode != http.StatusOK {
		log.Error().Msgf("Elasticsearch index validation failed. Status code: %d", resp.StatusCode)
		return false
	}

	return true
}
