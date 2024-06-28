package slack

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"time"

	intgerr "github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration/errors"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/spf13/cast"
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

func (s Slack) FormatSummaryMessage(message []map[string]interface{}) []map[string]interface{} {

	blocks := []map[string]interface{}{}

	for _, m := range message {

		// header
		blocks = append(
			blocks,
			map[string]interface{}{
				"type": "header",
				"text": map[string]interface{}{
					"type":  "plain_text",
					"text":  fmt.Sprintf("%s Scan", s.Resource),
					"emoji": true,
				},
			},
		)

		// info section
		startedAt := time.UnixMilli(cast.ToInt64(m["created_at"])).Format(time.RFC1123)
		completedAt := time.UnixMilli(cast.ToInt64(m["updated_at"])).Format(time.RFC1123)
		blocks = append(
			blocks,
			map[string]interface{}{
				"type": "section",
				"fields": []map[string]interface{}{
					{
						"type": "mrkdwn",
						"text": fmt.Sprintf("*Node Type:*\n%v", m["node_type"]),
					},
					{
						"type": "mrkdwn",
						"text": fmt.Sprintf("*Node Name:*\n%v", m["node_name"]),
					},
					{
						"type": "mrkdwn",
						"text": fmt.Sprintf("*Started On:*\n %s", startedAt),
					},
					{
						"type": "mrkdwn",
						"text": fmt.Sprintf("*Completed On:*\n %s", completedAt),
					},
				},
			},
		)

		// sort by map key
		sev := m["severity_counts"].(map[string]int32)
		keys := make([]string, 0, len(sev))
		for k := range m {
			keys = append(keys, k)
		}
		slices.Sort(keys)

		// Severity section
		var severity string = ""
		for k := range sev {
			severity += fmt.Sprintf(">_%s:_ %d\n", k, sev[k])
		}

		blocks = append(
			blocks,
			map[string]interface{}{
				"type": "section",
				"fields": []map[string]interface{}{
					{
						"type": "mrkdwn",
						"text": fmt.Sprintf("*%s Severity Count:*\n%s", s.Resource, severity),
					},
				},
			},
		)

		// link
		blocks = append(
			blocks,
			map[string]interface{}{
				"type": "section",
				"fields": []map[string]interface{}{
					{
						"type": "mrkdwn",
						"text": fmt.Sprintf("<%v|*Click here*> to view scan results on Console",
							m["scan_result_link"]),
					},
				},
			},
		)

		// add a divider
		blocks = append(
			blocks,
			map[string]interface{}{
				"type": "divider",
			},
		)

	}

	return blocks
}

func (s Slack) SendNotification(ctx context.Context, message []map[string]interface{}, extras map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "slack-send-notification")
	defer span.End()

	totalMessages := len(message)
	numBatches := (totalMessages + BatchSize - 1) / BatchSize

	for i := 0; i < numBatches; i++ {
		startIdx := i * BatchSize
		endIdx := (i + 1) * BatchSize
		if endIdx > totalMessages {
			endIdx = totalMessages
		}

		batchMsg := message[startIdx:endIdx]

		var m []map[string]interface{}

		if s.SendSummaryLink() {
			m = s.FormatSummaryMessage(batchMsg)
		} else {
			m = s.FormatMessage(batchMsg, startIdx+1)
		}

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
		req, err := http.NewRequest(http.MethodPost, s.Config.WebhookURL, bytes.NewBuffer(payloadBytes))
		if err != nil {
			log.Error().Err(err).Msg("error create http request")
			span.EndWithErr(err)
			return err
		}
		req.Header.Set("Content-Type", "application/json")

		// Make the HTTP request.
		client := utils.GetHTTPClient()
		resp, err := client.Do(req)
		if err != nil {
			log.Error().Err(err).Msg("error on http request")
			span.EndWithErr(err)
			return intgerr.CheckHTTPError(err)
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
			return fmt.Errorf("failed to send notification batch %d, status code: %d , error: %s",
				i+1, resp.StatusCode, errorMsg)
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
		log.Error().Msg(err.Error())
		return false, nil
	}

	// send message to this webhookURL using http
	// Set up the HTTP request.
	req, err := http.NewRequest(http.MethodPost, s.Config.WebhookURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Error().Msg(err.Error())
		return false, err
	}
	req.Header.Set("Content-Type", "application/json")

	// Make the HTTP request.
	client := utils.GetHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msg(err.Error())
		return false, err
	}

	// Check the response status code.
	if resp.StatusCode != http.StatusOK {
		log.Error().Err(err).Msgf("failed to send notification, status code: %d", resp.StatusCode)
		return false, fmt.Errorf("failed to send test notification, status code: %d", resp.StatusCode)
	}
	resp.Body.Close()

	return true, nil
}

func (a Slack) SendSummaryLink() bool {
	return a.Config.SendSummary
}
