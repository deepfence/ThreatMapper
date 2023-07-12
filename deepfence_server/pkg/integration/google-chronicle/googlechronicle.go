package googlechronicle

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
)

func New(b []byte) (*GoogleChronicle, error) {
	p := GoogleChronicle{}
	err := json.Unmarshal(b, &p)
	if err != nil {
		return &p, err
	}
	return &p, nil
}

func (g GoogleChronicle) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {
	var req *http.Request
	var err error

	payloadBytes := []byte(message)

	// send message to this elasticsearch using http
	// Set up the HTTP request.
	req, err = http.NewRequest("POST", g.Config.URL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return err
	}

	if g.Config.AuthKey != "" {
		req.Header.Set("Authorization", g.Config.AuthKey)
	}

	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

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
