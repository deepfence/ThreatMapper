package email

import (
	"encoding/json"
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
	return nil
}
