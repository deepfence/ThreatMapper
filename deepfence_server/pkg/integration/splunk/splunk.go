package splunk

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"net/http"
	"strings"
	"time"
)

var MaxContentLength = 10000

func New(ctx context.Context, b []byte) (Splunk, error) {
	var s Splunk
	err := json.Unmarshal(b, &s)
	if err != nil {
		return s, err
	}
	return s, nil
}

func (s Splunk) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {
	var msg []map[string]interface{}
	d := json.NewDecoder(strings.NewReader(message))
	if err := d.Decode(&msg); err != nil {
		fmt.Println("Failed to unmarshal message for splunk", err)
		return err
	}
	var buffer bytes.Buffer
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
		fmt.Println("Splunk sent buffer:", buffer.Len())
		fmt.Println(buffer.String())
		// Send out bytes in buffer immediately if the limit exceeded after adding this event
		if buffer.Len()+len(jsonBytes) > MaxContentLength {
			s.sendRequest(buffer)
			fmt.Println("Splunk sent buffer:")
			fmt.Println(buffer.String())
			buffer.Reset()
		}
		buffer.Write(jsonBytes)
	}
	if buffer.Len() > 0 {
		s.sendRequest(buffer)
	}

	fmt.Println("Data sent to Splunk successfully")
	return nil
}

// HECEvent represents an event for the Splunk HTTP Event Collector (HEC) API
type HECEvent struct {
	Event map[string]interface{} `json:"event"`
}

func (s Splunk) sendRequest(buffer bytes.Buffer) {
	client := utils.GetInsecureHttpClient()
	// Create a new request to send the JSON data to Splunk
	req, err := http.NewRequest("POST", s.Config.EndpointURL, bytes.NewReader(buffer.Bytes()))
	if err != nil {
		fmt.Println("Failed to create HTTP request", err)
	}
	req.Header.Set("Authorization", "Splunk "+s.Config.Token)
	// req.Header.Set("Content-Type", "application/json")

	// Send the request to Splunk
	resp, err := client.Do(req)
	defer resp.Body.Close()
	if err != nil {
		fmt.Println("Failed to send data to Splunk", err)
	}

	// Check the response status code
	if resp.StatusCode != http.StatusOK {
		fmt.Println("Failed to send data to Splunk", resp.Status)
	}
}
