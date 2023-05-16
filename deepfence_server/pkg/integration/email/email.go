package email

import (
	"encoding/json"

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

func (e Email) SendNotification(message string) error {
	emailSender, err := sendemail.NewEmailSender()
	if err != nil {
		return err
	}
	return emailSender.Send([]string{e.Config.EmailId}, "Deepfence Subscription", message, "", nil)
}
