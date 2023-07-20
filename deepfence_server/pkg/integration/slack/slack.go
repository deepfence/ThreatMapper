package slack

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// todo: add support for batch size
const BatchSize = 100

func New(ctx context.Context, b []byte) (*Slack, error) {
	s := Slack{}
	err := json.Unmarshal(b, &s)
	if err != nil {
		return &s, err
	}
	return &s, nil
}

func (s Slack) FormatMessage(message []map[string]interface{}) []map[string]interface{} {
	cardAttachments := []map[string]interface{}{}

	for k, v := range message {
		attachmentColor := "#36a64f" // Default color (green)

		switch s.Resource {
		case "Malware":
			fileSeverity, ok := v["file_severity"].(string)
			if ok {
				if fileSeverity == "high" {
					attachmentColor = "#ff0000" // Red color for high severity
				} else if fileSeverity == "medium" {
					attachmentColor = "#ffcc00" // Orange color for medium severity
				} else if fileSeverity == "low" {
					attachmentColor = "#008000" // Dark green color for low severity
				}
			}
		case "Secret":
			level, ok := v["level"].(string)
			if ok {
				if level == "high" {
					attachmentColor = "#ff0000" // Red color for high level
				} else if level == "medium" {
					attachmentColor = "#ffcc00" // Orange color for medium level
				} else if level == "low" {
					attachmentColor = "#008000" // Dark green color for low level
				}
			}
		case "Vulnerability":
			cveSeverity, ok := v["cve_severity"].(string)
			if ok {
				if cveSeverity == "high" {
					attachmentColor = "#ff0000" // Red color for high CVE severity
				} else if cveSeverity == "medium" {
					attachmentColor = "#ffcc00" // Orange color for medium CVE severity
				} else if cveSeverity == "low" {
					attachmentColor = "#008000" // Dark green color for low CVE severity
				}
			}
		default:
			attachmentColor = "#808080" // Grey color for unknown type
		}

		cardAttachments = append(cardAttachments, map[string]interface{}{
			"color": attachmentColor,
			"blocks": []map[string]interface{}{
				{
					"type": "section",
					"fields": []map[string]interface{}{
						{
							"type": "mrkdwn",
							"text": fmt.Sprintf("*#%d*", k+1),
						},
					},
				},
			},
		})

		for key, val := range v {
			cardAttachments[len(cardAttachments)-1]["blocks"] = append(cardAttachments[len(cardAttachments)-1]["blocks"].([]map[string]interface{}), map[string]interface{}{
				"type": "section",
				"fields": []map[string]interface{}{
					{
						"type": "mrkdwn",
						"text": fmt.Sprintf("*%s*: %v", key, val),
					},
				},
			})
		}
	}

	// cardJSON, _ := json.Marshal(card)
	return cardAttachments
}

func (s Slack) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {
	// formatting : unmarshal into payload
	var msg []map[string]interface{}
	err := json.Unmarshal([]byte(message), &msg)
	if err != nil {
		return err
	}
	m := s.FormatMessage(msg)
	payload := map[string]interface{}{
		"text":        s.Resource,
		"attachments": m,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	// send message to this webhookURL using http
	// Set up the HTTP request.
	req, err := http.NewRequest("POST", s.Config.WebhookURL, bytes.NewBuffer(payloadBytes))
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

// func (s Slack) FormatMessage
