package sumologic

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

func New(b []byte) (SumoLogic, error) {
	var s SumoLogic
	err := json.Unmarshal(b, &s.Config)
	if err != nil {
		return s, err
	}
	if s.Config.HTTPEndpoint == "" {
		return s, errors.New("invalid Sumo Logic configuration")
	}
	return s, nil
}

func (s SumoLogic) SendNotification(ctx context.Context, data string, extra map[string]interface{}) error {

	// Create an HTTP client with a timeout
	client := &http.Client{
		Timeout: time.Second * 10,
	}

	// Create a new JSON object with the data
	payload := map[string]string{
		"message": data,
	}

	// Marshal the payload to JSON
	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		fmt.Println("Failed to marshal payload to JSON", err)
		return err
	}

	// Create a new request to send the JSON data to Sumo Logic
	req, err := http.NewRequest("POST", s.Config.HTTPEndpoint, bytes.NewBuffer(jsonBytes))
	if err != nil {
		fmt.Println("Failed to create HTTP request", err)
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	// Send the request to Sumo Logic
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Failed to send data to Sumo Logic", err)
		return err
	}
	defer resp.Body.Close()

	// Check the response status code
	if resp.StatusCode != http.StatusOK {
		fmt.Println("Failed to send data to Sumo Logic", resp.Status)
		return errors.New(resp.Status)
	}

	fmt.Println("Data sent to Sumo Logic successfully")
	return nil
}
