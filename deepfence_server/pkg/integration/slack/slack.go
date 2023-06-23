package slack

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

// todo: add support for batch size
const BatchSize = 100

func New(b []byte) (*Slack, error) {
	s := Slack{}
	err := json.Unmarshal(b, &s)
	if err != nil {
		return &s, err
	}
	return &s, nil
}

func (s Slack) FormatMessage(message []map[string]interface{}) string {
	entiremsg := "*" + s.Resource + "*\n\n"
	for k, v := range message {
		entiremsg = entiremsg + fmt.Sprintf("#%d\n", k+1)
		for key, val := range v {
			entiremsg += fmt.Sprintf("%s:%s\n", key, val)
		}
		entiremsg = entiremsg + "\n"
	}
	return entiremsg
}

func (s Slack) SendNotification(message string, extras map[string]interface{}) error {
	// formatting : unmarshal into payload
	var msg []map[string]interface{}
	err := json.Unmarshal([]byte(message), &msg)
	if err != nil {
		return err
	}
	m := s.FormatMessage(msg)
	payload := Payload{
		Text: m,
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
