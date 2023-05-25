package email

import (
	"encoding/json"
	"fmt"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/sendemail"
)

// BatchSize todo: add support for batch size
const BatchSize = 100

func New(b []byte) (*Email, error) {
	h := Email{}
	err := json.Unmarshal(b, &h)
	if err != nil {
		return &h, err
	}
	return &h, nil
}

func (e Email) FormatMessage(message []map[string]interface{}) string {
	entiremsg := "*" + e.Resource + "*\n\n"
	for k, v := range message {
		entiremsg = entiremsg + fmt.Sprintf("#%d\n", k+1)
		for key, val := range v {
			entiremsg += fmt.Sprintf("%s:%s\n", key, val)
		}
		entiremsg = entiremsg + "\n"
	}
	return entiremsg
}

func (e Email) SendNotification(message string) error {
	// formatting : unmarshal into payload
	var msg []map[string]interface{}
	err := json.Unmarshal([]byte(message), &msg)
	if err != nil {
		return err
	}
	m := e.FormatMessage(msg)
	emailSender, err := sendemail.NewEmailSender()
	if err != nil {
		return err
	}
	return emailSender.Send([]string{e.Config.EmailId}, "Deepfence Subscription", m, "", nil)
}
