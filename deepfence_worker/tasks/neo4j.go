package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_worker/cronjobs"
	"github.com/hibiken/asynq"
)

const (
	CleanUpGraphDBTaskID = "CleanUpGraphDB"
)

type CleanUpGraphDBContext struct {
	Namespace directory.NamespaceID `json:"namespace"`
}

func NewCleanUpGraphDBTask(ns directory.NamespaceID) (*asynq.Task, error) {
	payload, err := json.Marshal(CleanUpGraphDBContext{Namespace: ns})
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(CleanUpGraphDBTaskID, payload, asynq.Unique(time.Minute*30)), nil
}

func HandleCleanUpGraphDBTask(_ context.Context, t *asynq.Task) error {
	var p CleanUpGraphDBContext
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}
	start := time.Now()
	err := cronjobs.CleanUpDB(directory.NewContextWithNameSpace(p.Namespace))
	log.Info().Msgf("DB clean: %v", time.Since(start))
	if err != nil {
		log.Error().Msgf("clean neo4j err: %v", err)
	}
	return err
}
