package teams

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

// todo: add support for batch size
const BatchSize = 100

func New(b []byte) (*Teams, error) {
	t := Teams{}
	err := json.Unmarshal(b, &t)
	if err != nil {
		return &t, err
	}
	return &t, nil
}

func (t Teams) FormatMessage(message []map[string]interface{}) string {
	entiremsg := "*" + t.NotificationType + "*\n\n"
	for k, v := range message {
		entiremsg = entiremsg + fmt.Sprintf("#%d\n", k+1)
		for key, val := range v {
			entiremsg = fmt.Sprintf("%s:%s\n", key, val)
		}
		entiremsg = entiremsg + "\n"
	}
	return entiremsg
}

func (t Teams) SendNotification(message string, extras map[string]interface{}) error {
	var msg []map[string]interface{}
	err := json.Unmarshal([]byte(message), &msg)
	if err != nil {
		return err
	}
	m := t.FormatMessage(msg)
	payload := Payload{
		Text: m,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	// send message to this webhookURL using http
	// Set up the HTTP request.
	req, err := http.NewRequest("POST", t.Config.WebhookURL, bytes.NewBuffer(payloadBytes))
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
