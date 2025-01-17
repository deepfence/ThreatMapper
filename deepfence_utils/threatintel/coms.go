package threatintel

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

type Message struct {
	ID        int    `json:"id"`
	Content   string `json:"content"`
	UpdatedAt int64  `json:"updated_at"`
}

type Coms struct {
	UpdatedAt int64     `json:"updated_at"`
	Messages  []Message `json:"messages"`
}

const comsURL = "https://deepfence-coms.s3.us-east-2.amazonaws.com/ThreatMapper/coms.json"

func GetCommunicationMessages() (Coms, error) {

	resp, err := http.Get(comsURL)
	if err != nil {
		return Coms{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return Coms{}, errors.New("Failed reaching data")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return Coms{}, err
	}

	var data Coms
	err = json.Unmarshal(body, &data)
	if err != nil {
		return Coms{}, err
	}

	return data, nil
}
