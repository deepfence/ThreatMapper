package jira

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func New(b []byte) (*Jira, error) {
	h := Jira{}
	err := json.Unmarshal(b, &h)
	if err != nil {
		return &h, err
	}
	return &h, nil
}

func (j Jira) SendNotification(message string, extras map[string]interface{}) error {
	payload := map[string]interface{}{
		"fields": map[string]interface{}{
			"project": map[string]interface{}{
				"key": j.Config.JiraProjectKey,
			},
			"summary":     "Issue summary",
			"description": message,
			"issuetype": map[string]interface{}{
				"name": j.Config.IssueType,
			},
		},
	}

	// Convert the payload to a JSON string
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		panic(err)
	}

	// Create a new HTTP request with the JSON payload
	req, err := http.NewRequest("POST", j.Config.JiraSiteUrl, bytes.NewBuffer(payloadBytes))
	if err != nil {
		panic(err)
	}

	// Set the content type of the request to JSON
	req.Header.Set("Content-Type", "application/json")

	// Add your Jira credentials to the request header
	if j.Config.IsAuthToken {
		req.Header.Set("Authorization", "Basic "+j.Config.APIToken)
	} else {
		req.SetBasicAuth(j.Config.Username, j.Config.Password)
	}

	// Create a new HTTP client and send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}

	// Check the response status code
	if resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("Failed to create issue: %d", resp.StatusCode)
	}

	// Print the response body
	fmt.Println("Issue created successfully!")
	return nil
}
