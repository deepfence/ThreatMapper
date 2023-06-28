package splunk

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

func New(b []byte) (Splunk, error) {
	var s Splunk
	err := json.Unmarshal(b, &s.Config)
	if err != nil {
		return s, err
	}
	if s.Config.EndpointURL == "" || s.Config.Token == "" {
		return s, errors.New("invalid Splunk configuration")
	}
	return s, nil
}

func (s Splunk) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {
	// Create an HTTP client with a timeout
	client := &http.Client{
		Timeout: time.Second * 10,
	}

	// Create a new HEC event with the data
	event := HECEvent{Event: message}

	// Marshal the HEC event to JSON
	jsonBytes, err := json.Marshal(event)
	if err != nil {
		fmt.Println("Failed to marshal HEC event to JSON", err)
		return err
	}

	// Create a new request to send the JSON data to Splunk
	req, err := http.NewRequest("POST", s.Config.EndpointURL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		fmt.Println("Failed to create HTTP request", err)
		return err
	}
	req.Header.Set("Authorization", "Splunk "+s.Config.Token)
	req.Header.Set("Content-Type", "application/json")

	// Send the request to Splunk
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Failed to send data to Splunk", err)
		return err
	}
	defer resp.Body.Close()

	// Check the response status code
	if resp.StatusCode != http.StatusOK {
		fmt.Println("Failed to send data to Splunk", resp.Status)
		return errors.New(resp.Status)
	}

	fmt.Println("Data sent to Splunk successfully")
	return nil
}

// HECEvent represents an event for the Splunk HTTP Event Collector (HEC) API
type HECEvent struct {
	Event string `json:"event"`
}
