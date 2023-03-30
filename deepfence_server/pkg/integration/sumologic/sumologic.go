package sumologic

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

func (s SumoLogic) SendNotification(data string) error {
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
