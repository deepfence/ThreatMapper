package integration

import (
	"bytes"
	"fmt"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

type Batcher struct {
	http_endpoint    string
	buffer_limit     int
	msgs_limit       int
	time_limit       time.Duration
	request_enricher func(*http.Request)
	messages         chan string
}

func NewBatcher(endpoint string,
	buffer_limit int,
	time_limit time.Duration,
	request_enricher func(*http.Request)) *Batcher {
	return &Batcher{
		http_endpoint:    endpoint,
		buffer_limit:     buffer_limit,
		time_limit:       time_limit,
		request_enricher: request_enricher,
		messages:         make(chan string, 10),
	}
}

func (b *Batcher) Dispatch() error {
	go func() {
		client := utils.GetInsecureHttpClient()
		msg_buf := []string{}
		ticker := time.NewTicker(b.time_limit)
		buf := bytes.Buffer{}
		for {
			ticker.Reset(b.time_limit)
			send_batch := false
			msg := ""
			select {
			case msg = <-b.messages:
				if len(msg) >= b.buffer_limit {
					log.Error().Msg("Payload too big, dropping")
					continue
				}
				send_batch = buf.Len()+len(msg) < b.buffer_limit
			case <-ticker.C:
				send_batch = len(msg_buf) != 0
			}

			if !send_batch {
				if len(msg) != 0 {
					buf.Write([]byte(msg))
				}
				continue
			}

			err := b.send_http_request(client, &buf)
			buf.Reset()
			if err != nil {
				log.Error().Msgf("sending http request: %v", err)
			}

			if len(msg) != 0 {
				buf.Write([]byte(msg))
			}
		}
	}()
	return nil
}

func (b *Batcher) send_http_request(client *http.Client, buf *bytes.Buffer) error {
	req, err := http.NewRequest("POST", b.http_endpoint, bytes.NewReader(buf.Bytes()))
	if err != nil {
		return err
	}
	b.request_enricher(req)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Not Ok status: %v", resp.StatusCode)
	}
	return nil
}
