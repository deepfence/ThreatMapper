package teams

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/spf13/cast"
)

const BatchSize = 5

func New(ctx context.Context, b []byte) (*Teams, error) {
	t := Teams{}
	err := json.Unmarshal(b, &t)
	if err != nil {
		return &t, err
	}
	return &t, nil
}

func (t Teams) FormatMessage(message map[string]interface{}, position int, entiremsg *strings.Builder) string {
	entiremsg.Reset()
	if position == 1 {
		entiremsg.WriteString("**")
		entiremsg.WriteString(t.Resource)
		entiremsg.WriteString("**\n\n")
	}
	entiremsg.WriteString("**#")
	entiremsg.WriteString(strconv.Itoa(position))
	entiremsg.WriteString("**\n")

	for key, val := range message {
		entiremsg.WriteString(fmt.Sprintf("**%s**:%s\n", key, val))
	}
	entiremsg.WriteString("\n")
	return entiremsg.String()
}

func (t Teams) SendNotification(ctx context.Context,
	message []map[string]interface{}, extras map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "teams-send-notification")
	defer span.End()

	t.client = utils.GetHTTPClient()

	numRoutines := (len(message) / 10)
	if numRoutines == 0 {
		numRoutines = 1
	} else if numRoutines > 10 {
		numRoutines = 10
	}

	senderChan := make(chan any, 500)
	var wg sync.WaitGroup
	for i := 0; i < numRoutines; i++ {
		wg.Add(1)
		go t.Sender(senderChan, &wg)
	}

	defer func() {
		close(senderChan)
		wg.Wait()
		log.Info().Msgf("Teams::SendNotification complete, numRoutines:%d", numRoutines)
	}()

	startIndex := 0
	endIndex := 0

	for endIndex < len(message) {
		startIndex = endIndex
		endIndex += BatchSize
		if endIndex > len(message) {
			endIndex = len(message)
		}
		if !t.SendSummaryLink() {
			t.enqueueNotification(message[startIndex:endIndex], senderChan)
		} else {
			t.enqueueSummaryNotification(message[startIndex:endIndex], senderChan)
		}
	}
	return nil
}

func (t Teams) enqueueNotification(payloads []map[string]interface{}, senderChan chan any) {

	var message strings.Builder
	var b strings.Builder
	for index, msgMap := range payloads {
		message.WriteString(t.FormatMessage(msgMap, index+1, &b))
	}
	payload := Payload{
		Text:       message.String(),
		CardType:   "MessageCard",
		Context:    "http://schema.org/extensions",
		ThemeColor: "007FFF",
	}

	senderChan <- &payload
}

func (t Teams) enqueueSummaryNotification(payloads []map[string]interface{}, senderChan chan any) {

	for _, m := range payloads {

		ac := NewAdaptiveCards()

		body := []map[string]interface{}{}

		// header
		body = append(
			body,
			map[string]interface{}{
				"type":   "TextBlock",
				"size":   "medium",
				"weight": "bolder",
				"style":  "heading",
				"text":   fmt.Sprintf("Deepfence %s Scan", t.Resource),
			},
		)

		// info
		startedAt := time.UnixMilli(cast.ToInt64(m["created_at"])).Format(time.RFC1123)
		completedAt := time.UnixMilli(cast.ToInt64(m["updated_at"])).Format(time.RFC1123)
		body = append(
			body,
			map[string]interface{}{
				"type": "TextBlock",
				"text": fmt.Sprintf("**Node Type:** %s", m["node_type"]),
				"warp": "true",
			},
			map[string]interface{}{
				"type": "TextBlock",
				"text": fmt.Sprintf("**Node Name:** %s", m["node_name"]),
				"warp": "true",
			},
			map[string]interface{}{
				"type": "TextBlock",
				"text": fmt.Sprintf("**Started On:** %s", startedAt),
				"warp": "true",
			},
			map[string]interface{}{
				"type": "TextBlock",
				"text": fmt.Sprintf("**Completed On:** %s", completedAt),
				"warp": "true",
			},
		)

		// Severity section
		var severity = ""
		for k, v := range m["severity_counts"].(map[string]int32) {
			severity += fmt.Sprintf("> _%s:_ %d\n", k, v)
		}

		body = append(
			body,
			map[string]interface{}{
				"type": "TextBlock",
				"text": fmt.Sprintf("**%s Severity Count:**\n%s", t.Resource, severity),
				"warp": "true",
			},
		)

		body = append(
			body,
			map[string]interface{}{
				"type": "TextBlock",
				"text": fmt.Sprintf("[Click here](%s) to view scan results on Console", m["scan_result_link"]),
			},
		)

		ac.AddAttachment(NewAttachment(NewContent(body, nil)))

		// send summary card
		senderChan <- &ac
	}

}

func (t Teams) Sender(in chan any, wg *sync.WaitGroup) {
	defer wg.Done()

	for {
		payload, ok := <-in
		if !ok {
			break
		}

		payloadBytes, err := json.Marshal(payload)
		if err != nil {
			continue
		}

		req, err := http.NewRequest("POST", t.Config.WebhookURL, bytes.NewBuffer(payloadBytes))
		if err != nil {
			log.Info().Msgf("Failed to create HTTP request: %v", err)
			continue
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := t.client.Do(req)
		if err != nil {
			log.Info().Msgf("Failed to send data to Teams: %v", err)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			log.Info().Msgf("Failed to send data to Teams %s", resp.Status)
		}
		resp.Body.Close()
	}
}

func (t Teams) IsValidCredential(ctx context.Context) (bool, error) {
	t.client = utils.GetHTTPClient()

	payload := Payload{
		Text:       "Test message from Deepfence",
		CardType:   "MessageCard",
		Context:    "http://schema.org/extensions",
		ThemeColor: "007FFF",
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Info().Msgf("Failed to marshal payload: %v", err)
		return false, nil
	}

	req, err := http.NewRequest("POST", t.Config.WebhookURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Info().Msgf("Failed to create HTTP request: %v", err)
		return false, nil
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := t.client.Do(req)
	if err != nil {
		log.Info().Msgf("Failed to send data to Teams: %v", err)
		return false, err
	}

	if resp.StatusCode != http.StatusOK {
		log.Info().Msgf("Failed to send data to Teams %s", resp.Status)
		return false, fmt.Errorf("failed to connect to Teams: %s", resp.Status)
	}
	resp.Body.Close()

	return true, nil
}

func (t Teams) SendSummaryLink() bool {
	return t.Config.SendSummary
}
