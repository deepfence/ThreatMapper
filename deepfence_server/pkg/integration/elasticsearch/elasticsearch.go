package elasticsearch

import (
	"bytes"
	"encoding/json"
	"net/http"
)

func New(b []byte) (*ElasticSearch, error) {
	p := ElasticSearch{}
	err := json.Unmarshal(b, &p)
	if err != nil {
		return &p, err
	}
	return &p, nil
}

func (h ElasticSearch) SendNotification(message string) error {
	var req *http.Request
	var err error

	payloadBytes := []byte("{\"index\":{\"_index\":\"" + h.Config.Index + "\"}}\n" + message)

	// send message to this elasticsearch using http
	// Set up the HTTP request.
	req, err = http.NewRequest("POST", h.Config.URL+"/_bulk", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return err
	}

	if h.Config.AuthHeader != "" {
		req.Header.Set("Authorization", h.Config.AuthHeader)
	}

	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-ndjson")

	// Make the HTTP request.
	client := &http.Client{}
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
