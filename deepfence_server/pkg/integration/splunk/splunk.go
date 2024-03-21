package splunk

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/rs/zerolog/log"
)

var MaxContentLength = 10000

// HECEvent represents an event for the Splunk HTTP Event Collector (HEC) API
type HECEvent struct {
	Event map[string]interface{} `json:"event"`
}

func New(ctx context.Context, b []byte) (Splunk, error) {
	var s Splunk
	err := json.Unmarshal(b, &s)
	if err != nil {
		return s, err
	}
	return s, nil
}

func (s Splunk) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {

	_, span := telemetry.NewSpan(ctx, "integrations", "splunk-send-notification")
	defer span.End()

	s.client = utils.GetInsecureHTTPClient()
	var msg []map[string]interface{}
	d := json.NewDecoder(strings.NewReader(message))
	if err := d.Decode(&msg); err != nil {
		fmt.Println("Failed to unmarshal message for splunk", err)
		return err
	}

	numRoutines := (len(msg) / 10)
	if numRoutines == 0 {
		numRoutines = 1
	} else if numRoutines > 10 {
		numRoutines = 10
	}

	senderChan := make(chan []byte, 500)
	var wg sync.WaitGroup
	for i := 0; i < numRoutines; i++ {
		wg.Add(1)
		go s.Sender(senderChan, &wg)
	}

	defer func() {
		close(senderChan)
		wg.Wait()
		log.Info().Msgf("SPLUNK::SendNotification complete, numRoutines:%d", numRoutines)
	}()

	var buffer bytes.Buffer
	for _, payload := range msg {
		currentMicro := time.Now().UnixMicro()
		payload["timestamp"] = currentMicro
		payload["@timestamp"] = currentMicro

		event := HECEvent{Event: payload}
		jsonBytes, err := json.Marshal(event)
		if err != nil {
			log.Info().Msgf("Failed to marshal HEC event to JSON, %v", err)
			continue
		}

		// Send out bytes in buffer immediately if the limit exceeded after adding this event
		if buffer.Len()+len(jsonBytes) > MaxContentLength {
			b := make([]byte, buffer.Len())
			copy(b, buffer.Bytes())
			senderChan <- b
			buffer.Reset()
		}
		buffer.Write(jsonBytes)
	}

	if buffer.Len() > 0 {
		senderChan <- buffer.Bytes()
	}

	return nil
}

func (s Splunk) Sender(in chan []byte, wg *sync.WaitGroup) {
	defer wg.Done()
	authToken := "Splunk " + s.Config.Token

	for {
		data, ok := <-in
		if !ok {
			break
		}

		req, err := http.NewRequest("POST", s.Config.EndpointURL, bytes.NewReader(data))
		if err != nil {
			log.Error().Msgf("Failed to create HTTP request: %v", err)
			continue
		}
		req.Header.Set("Authorization", authToken)
		resp, err := s.client.Do(req)
		if err != nil {
			log.Error().Msgf("Failed to send data to Splunk: %v", err)
			continue
		}

		// Check the response status code
		if resp.StatusCode != http.StatusOK {
			log.Error().Msgf("Failed to send data to Splunk %s", resp.Status)
		}
		resp.Body.Close()
	}
}

// todo
func (s Splunk) IsValidCredential(ctx context.Context) (bool, error) {
	return true, nil
}
