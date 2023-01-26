package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/controls"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) GetAgentControls(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	data, err := io.ReadAll(r.Body)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	var agentId model.AgentId

	err = json.Unmarshal(data, &agentId)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	actions, err := controls.GetAgentActions(ctx, agentId.NodeId)
	if err != nil {
		log.Warn().Msgf("Cannot get actions for %s: %v, skipping", agentId.NodeId, err)
	}

	res := ctl.AgentControls{
		BeatRateSec: 30,
		Commands:    actions,
	}
	b, err := json.Marshal(res)
	if err != nil {
		log.Error().Msgf("Cannot marshal controls: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	w.Header().Add("Content-Type", "application/json")
	_, err = w.Write(b)

	if err != nil {
		log.Error().Msgf("Cannot send controls: %v", err)
		w.WriteHeader(http.StatusGone)
		return
	}
}

func (h *Handler) GetAgentInitControls(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	data, err := io.ReadAll(r.Body)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	var agentId model.AgentId

	err = json.Unmarshal(data, &agentId)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	actions, err := controls.GetPendingAgentScans(ctx, agentId.NodeId)
	if err != nil {
		log.Warn().Msgf("Cannot get actions: %s, skipping", err)
	}

	res := ctl.AgentControls{
		BeatRateSec: 30,
		Commands:    actions,
	}
	b, err := json.Marshal(res)
	if err != nil {
		log.Error().Msgf("Cannot marshal controls: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	w.Header().Add("Content-Type", "application/json")
	_, err = w.Write(b)

	if err != nil {
		log.Error().Msgf("Cannot send controls: %v", err)
		w.WriteHeader(http.StatusGone)
		return
	}
}

func (h *Handler) GetLatestAgentVersion(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var current model.AgentImageMetadata
	err := httpext.DecodeQueryParams(r, &current)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	latest, err := controls.GetLatestAgentVersion(ctx)
	if err != nil {
		log.Error().Msgf("Cannot get latest version: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	b, err := json.Marshal(latest)
	if err != nil {
		log.Error().Msgf("Cannot marshal controls: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	w.Header().Add("Content-Type", "application/json")
	_, err = w.Write(b)

	if err != nil {
		log.Error().Msgf("Cannot send controls: %v", err)
		w.WriteHeader(http.StatusGone)
		return
	}
}

func (h *Handler) AddLatestAgentVersion(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	data, err := io.ReadAll(r.Body)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	var meta model.AgentImageMetadata

	err = json.Unmarshal(data, &meta)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	err = controls.SetLatestAgentVersion(ctx, meta)
	if err != nil {
		log.Error().Msgf("Cannot get latest version: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	b, err := json.Marshal(map[string]string{"success": "true"})
	if err != nil {
		log.Error().Msgf("Cannot marshal controls: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	w.Header().Add("Content-Type", "application/json")
	_, err = w.Write(b)

	if err != nil {
		log.Error().Msgf("Cannot send controls: %v", err)
		w.WriteHeader(http.StatusGone)
		return
	}
}
