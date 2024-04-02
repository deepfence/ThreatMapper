package slack

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	log "github.com/sirupsen/logrus"
)

const BatchSize = 5

func New(ctx context.Context, b []byte) (*Slack, error) {
	s := Slack{}
	err := json.Unmarshal(b, &s)
	if err != nil {
		return &s, err
	}
	return &s, nil
}

func (s Slack) FormatMessage(message []map[string]interface{}, index int) []map[string]interface{} {
	blocks := []map[string]interface{}{
		{
			"type": "section",
			"text": map[string]interface{}{
				"type": "mrkdwn",
				"text": fmt.Sprintf("*%s*\n", s.Resource),
			},
		},
	}

	// index := 1
	for _, v := range message {
		emojiColor := ":large_blue_square:" // Default color (green)

		switch s.Resource {
		case "Malware":
			if fileSeverity, ok := v["file_severity"].(string); ok {
				switch fileSeverity {
				case "critical":
					emojiColor = ":large_red_square:" // Red color for high severity
				case "high":
					emojiColor = ":large_orange_square:" // Orange color for medium severity
				case "medium":
					emojiColor = ":large_yellow_square:" // Dark green color for low severity
				case "low":
					emojiColor = ":large_blue_square:" // Dark green color for low severity
				}
			}
		case "Secret":
			if level, ok := v["level"].(string); ok {
				switch level {
				case "critical":
					emojiColor = ":large_red_square:" // Red color for high level
				case "high":
					emojiColor = ":large_orange_square:" // Orange color for medium level
				case "medium":
					emojiColor = ":large_yellow_square:" // Dark green color for low level
				case "low":
					emojiColor = ":large_blue_square:" // Dark green color for low level
				}
			}
		case "Vulnerability":
			if cveSeverity, ok := v["cve_severity"].(string); ok {
				switch cveSeverity {
				case "critical":
					emojiColor = ":large_red_square:" // Red color for high CVE severity
				case "high":
					emojiColor = ":large_orange_square:" // Orange color for medium CVE severity
				case "medium":
					emojiColor = ":large_yellow_square:" // Dark green color for low CVE severity
				case "low":
					emojiColor = ":large_blue_square:" // Dark green color for low CVE severity
				}
			}
		default:
			emojiColor = ":white_square:" // Grey color for unknown type
		}

		text := fmt.Sprintf("*%s #%d*\n", s.Resource, index)

		for key, val := range v {
			// text shouldn't be more than 3000 characters
			switch {
			case key == "file_severity" || key == "level" || key == "cve_severity":
				text = fmt.Sprintf("%s\n*%s*: %s %v", text, key, emojiColor, val)
			case key == "urls":
				// check if urls is a list
				urls, ok := val.([]interface{})
				if ok {
					// truncate urls to 3
					if len(urls) > 3 {
						urls = urls[:3]
					}
					text = fmt.Sprintf("%s\n*%s*: %v", text, key, urls)
				} else {
					text = fmt.Sprintf("%s\n*%s*: %v", text, key, val)
				}
			default:
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

	_, span := telemetry.NewSpan(ctx, "integrations", "slack-send-notification")
	defer span.End()

	// formatting: unmarshal into payload
	var msg []map[string]interface{}

	d := json.NewDecoder(strings.NewReader(message))
	d.UseNumber()
	if err := d.Decode(&msg); err != nil {
		return err
	}

	totalMessages := len(msg)
	numBatches := (totalMessages + BatchSize - 1) / BatchSize

	for i := 0; i < numBatches; i++ {
		startIdx := i * BatchSize
		endIdx := (i + 1) * BatchSize
		if endIdx > totalMessages {
			endIdx = totalMessages
		}

		batchMsg := msg[startIdx:endIdx]

		m := s.FormatMessage(batchMsg, startIdx+1)
		payload := map[string]interface{}{
			"blocks": m,
		}

		payloadBytes, err := json.Marshal(payload)
		if err != nil {
			span.EndWithErr(err)
			return err
		}

		// send message to this webhookURL using http
		// Set up the HTTP request.
		req, err := http.NewRequest("POST", s.Config.WebhookURL, bytes.NewBuffer(payloadBytes))
		if err != nil {
			span.EndWithErr(err)
			return err
		}
		req.Header.Set("Content-Type", "application/json")

		// Make the HTTP request.
		client := utils.GetHTTPClient()
		resp, err := client.Do(req)
		if err != nil {
			span.EndWithErr(err)
			return err
		}

		// Check the response status code.
		if resp.StatusCode != http.StatusOK {
			// get error message from body
			errorMsg := ""
			if resp.Body != nil {
				buf := new(bytes.Buffer)
				_, err = buf.ReadFrom(resp.Body)
				if err != nil {
					errorMsg = err.Error()
				} else {
					errorMsg = buf.String()
				}
			}
			resp.Body.Close()
			return fmt.Errorf("failed to send notification batch %d, status code: %d , error: %s", i+1, resp.StatusCode, errorMsg)
		}
		resp.Body.Close()
	}

	return nil
}

func (s Slack) IsValidCredential(ctx context.Context) (bool, error) {
	// send test message to slack
	payload := map[string]interface{}{
		"text": "Test message from Deepfence",

		"blocks": []map[string]interface{}{
			{
				"type": "section",
				"text": map[string]interface{}{
					"type": "mrkdwn",
					"text": "Test message from Deepfence",
				},
			},
		},
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Errorf(err.Error())
		return false, nil
	}

	// send message to this webhookURL using http
	// Set up the HTTP request.
	req, err := http.NewRequest("POST", s.Config.WebhookURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Errorf(err.Error())
		return false, err
	}
	req.Header.Set("Content-Type", "application/json")

	// Make the HTTP request.
	client := utils.GetHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		log.Errorf(err.Error())
		return false, err
	}

	// Check the response status code.
	if resp.StatusCode != http.StatusOK {
		log.Errorf("failed to send notification, status code: %d", resp.StatusCode)
		return false, errors.New(fmt.Sprintf("failed to send test notification, status code: %d", resp.StatusCode))
	}
	resp.Body.Close()

	return true, nil
}
