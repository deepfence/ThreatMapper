package elasticsearch

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"net/http"
	"strings"
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
	client := utils.GetHttpClient()
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
