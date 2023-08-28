package splunk

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

func New(ctx context.Context, b []byte) (Splunk, error) {
	var s Splunk
	err := json.Unmarshal(b, &s)
	if err != nil {
		return s, err
	}
	return s, nil
}

func (s Splunk) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {
	// Create an HTTP client with a timeout
	client := &http.Client{
		Timeout: time.Second * 10,
	}

	var msg []map[string]interface{}
	d := json.NewDecoder(strings.NewReader(message))
	if err := d.Decode(&msg); err != nil {
		fmt.Println("Failed to unmarshal message for splunk", err)
		return err
	}
	for _, payload := range msg {
		currentMicro := time.Now().UnixMicro()
		payload["timestamp"] = currentMicro
		payload["@timestamp"] = currentMicro
		// Create a new HEC event with the data
		event := HECEvent{Event: payload}
		// Marshal the HEC event to JSON
		jsonBytes, err := json.Marshal(event)
		if err != nil {
			fmt.Println("Failed to marshal HEC event to JSON", err)
			continue
		}

		// Create a new request to send the JSON data to Splunk
		req, err := http.NewRequest("POST", s.Config.EndpointURL, bytes.NewBuffer(jsonBytes))
		if err != nil {
			fmt.Println("Failed to create HTTP request", err)
			continue
		}
		req.Header.Set("Authorization", "Splunk "+s.Config.Token)
		req.Header.Set("Content-Type", "application/json")

		// Send the request to Splunk
		resp, err := client.Do(req)
		if err != nil {
			fmt.Println("Failed to send data to Splunk", err)
			continue
		}

		// Check the response status code
		if resp.StatusCode != http.StatusOK {
			fmt.Println("Failed to send data to Splunk", resp.Status)
			continue
		}
		resp.Body.Close()
	}

	fmt.Println("Data sent to Splunk successfully")
	return nil
}

// HECEvent represents an event for the Splunk HTTP Event Collector (HEC) API
type HECEvent struct {
	Event map[string]interface{} `json:"event"`
}
