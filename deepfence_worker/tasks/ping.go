package tasks

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/hibiken/asynq"
)

const PingTaskID = "ping"

type PingPayload struct {
	Msg string
}

func NewPingTask(msg string) (*asynq.Task, error) {
	payload, err := json.Marshal(PingPayload{Msg: msg})
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(PingTaskID, payload), nil
}

func HandlePingTask(ctx context.Context, t *asynq.Task) error {
	var p PingPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}
	log.Info().Msgf("Pong: %v", p.Msg)
	return nil
}
