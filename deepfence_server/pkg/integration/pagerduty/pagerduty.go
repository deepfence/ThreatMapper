package pagerduty

import (
	"bytes"
	"encoding/json"
	"net/http"
)

const (
	url       = "https://api.pagerduty.com/services?include[]=integrations"
	BatchSize = 100
)

func New(b []byte) (*PagerDuty, error) {
	p := PagerDuty{}
	err := json.Unmarshal(b, &p)
	if err != nil {
		return &p, err
	}
	return &p, nil
}

func (p PagerDuty) SendNotification(message string, extras map[string]interface{}) error {
	var req *http.Request
	var err error

	payloadBytes := []byte(message)

	req, err = http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))

	req.Header.Set("Authorization", "Token token="+p.Config.APIKey)
	req.Header.Set("Accept", "application/vnd.pagerduty+json;version=2")
	req.Header.Set("Content-Type", "application/json")

	// Make the HTTP request.
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}
