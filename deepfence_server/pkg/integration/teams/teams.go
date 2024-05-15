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

	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/rs/zerolog/log"
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
		entiremsg.WriteString("**<br><br>")
	}
	entiremsg.WriteString("**#")
	entiremsg.WriteString(strconv.Itoa(position))
	entiremsg.WriteString("**<br>")

	for key, val := range message {
		entiremsg.WriteString(fmt.Sprintf("**%s**:%s<br>", key, val))
	}
	entiremsg.WriteString("<br>")
	return entiremsg.String()
}

func (t Teams) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "teams-send-notification")
	defer span.End()

	t.client = utils.GetHTTPClient()

	var msg []map[string]interface{}
	d := json.NewDecoder(strings.NewReader(message))
	d.UseNumber()
	if err := d.Decode(&msg); err != nil {
		log.Info().Msgf("Failed to unmarshal message for teams: %v", err)
		return err
	}

	numRoutines := (len(msg) / 10)
	if numRoutines == 0 {
		numRoutines = 1
	} else if numRoutines > 10 {
		numRoutines = 10
	}

	senderChan := make(chan *Payload, 500)
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

	for endIndex < len(msg) {
		startIndex = endIndex
		endIndex += BatchSize
		if endIndex > len(msg) {
			endIndex = len(msg)
		}
		t.enqueueNotification(msg[startIndex:endIndex], senderChan)
	}
	return nil
}

func (t Teams) enqueueNotification(payloads []map[string]interface{},
	senderChan chan *Payload) {

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

func (t Teams) Sender(in chan *Payload, wg *sync.WaitGroup) {
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
