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
	blocks := []map[string]interface{}{
		{
			"type": "section",
			"text": map[string]interface{}{
				"type": "mrkdwn",
				"text": fmt.Sprintf("*%s*\n", s.Resource),
			},
		},
	}

	index := 1
	for _, v := range message {
		emojiColor := ":large_blue_square:" // Default color (green)

		switch s.Resource {
		case "Malware":
			fileSeverity, ok := v["file_severity"].(string)
			if ok {
				if fileSeverity == "critical" {
					emojiColor = ":large_red_square:" // Red color for high severity
				} else if fileSeverity == "high" {
					emojiColor = ":large_orange_square:" // Orange color for medium severity
				} else if fileSeverity == "medium" {
					emojiColor = ":large_yellow_square:" // Dark green color for low severity
				} else if fileSeverity == "low" {
					emojiColor = ":large_blue_square:" // Dark green color for low severity
				}
			}
		case "Secret":
			level, ok := v["level"].(string)
			if ok {
				if level == "critical" {
					emojiColor = ":large_red_square:" // Red color for high level
				} else if level == "high" {
					emojiColor = ":large_orange_square:" // Orange color for medium level
				} else if level == "medium" {
					emojiColor = ":large_yellow_square:" // Dark green color for low level
				} else if level == "low" {
					emojiColor = ":large_blue_square:" // Dark green color for low level
				}
			}
		case "Vulnerability":
			cveSeverity, ok := v["cve_severity"].(string)
			if ok {
				if cveSeverity == "critical" {
					emojiColor = ":large_red_square:" // Red color for high CVE severity
				} else if cveSeverity == "high" {
					emojiColor = ":large_orange_square:" // Orange color for medium CVE severity
				} else if cveSeverity == "medium" {
					emojiColor = ":large_yellow_square:" // Dark green color for low CVE severity
				} else if cveSeverity == "low" {
					emojiColor = ":large_blue_square:" // Dark green color for low CVE severity
				}
			}
		default:
			emojiColor = ":white_square:" // Grey color for unknown type
		}

		text := fmt.Sprintf("*%s #%d*\n", s.Resource, index)

		for key, val := range v {
			if key == "file_severity" || key == "level" || key == "cve_severity" {
				text = fmt.Sprintf("%s\n*%s*: %s %v", text, key, emojiColor, val)
			} else {
				text = fmt.Sprintf("%s\n*%s*: %v", text, key, val)
			}
		}

		blocks = append(blocks, map[string]interface{}{
			"type": "section",
			"text": map[string]interface{}{
				"type": "mrkdwn",
				"text": text,
			},
		})
		index++
	}

	return blocks
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
		"text":   s.Resource,
		"blocks": m,
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
