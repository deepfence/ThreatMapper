package teams

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"net/http"
	"strings"
)

const BatchSize = 100

func New(ctx context.Context, b []byte) (*Teams, error) {
	t := Teams{}
	err := json.Unmarshal(b, &t)
	if err != nil {
		return &t, err
	}
	return &t, nil
}

func (t Teams) FormatMessage(message map[string]interface{}, position int) string {
	entiremsg := ""
	if position == 1 {
		entiremsg = "**" + t.Resource + "**<br><br>"
	}
	entiremsg = entiremsg + fmt.Sprintf("**#%d**<br>", position)
	for key, val := range message {
		entiremsg += fmt.Sprintf("**%s**:%s<br>", key, val)
	}
	entiremsg = entiremsg + "<br>"
	return entiremsg
}

func (t Teams) SendNotification(ctx context.Context, message string, extras map[string]interface{}) error {
	var msg []map[string]interface{}
	d := json.NewDecoder(strings.NewReader(message))
	d.UseNumber()
	if err := d.Decode(&msg); err != nil {
		return err
	}

	startIndex := 0
	endIndex := BatchSize
	if err := t.sendNotification(msg[startIndex:endIndex]); err != nil {
		return err
	}
	for endIndex < len(msg) {
		startIndex = endIndex
		endIndex += BatchSize
		if err := t.sendNotification(msg[startIndex:endIndex]); err != nil {
			return err
		}
	}
	return nil
}

func (t Teams) sendNotification(payloads []map[string]interface{}) error {
	message := ""
	for index, msgMap := range payloads {
		message += t.FormatMessage(msgMap, index+1)
	}
	payload := Payload{
		Text:       message,
		CardType:   "MessageCard",
		Context:    "http://schema.org/extensions",
		ThemeColor: "007FFF",
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
	client := utils.GetHttpClient()
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	// Check the response status code.
	if resp.StatusCode != http.StatusOK {
		return err
	}
	return nil
}
