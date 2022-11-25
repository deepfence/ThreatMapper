package handler

import (
	"fmt"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_utils/connection"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks"
)

func (h *Handler) Ping(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "pong")
}

func (h *Handler) AsyncPing(w http.ResponseWriter, r *http.Request) {
	task, err := tasks.NewPingTask("ping")
	if err != nil {
		log.Error().Msgf("could not create task: %v", err)
	}
	info, err := connection.WorkerClient().Enqueue(task)
	if err != nil {
		log.Error().Msgf("could not enqueue task: %v", err)
	}
	log.Info().Msgf("ping sent %v", info)
	return
}
