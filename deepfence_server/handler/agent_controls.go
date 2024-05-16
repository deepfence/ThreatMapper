package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/controls"
	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) GetAgentControls(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var agentID model.AgentID
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()

	err := decoder.Decode(&agentID)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	actions, errs := controls.GetAgentActions(ctx, agentID, h.GetHostURL(r), h.TTLCache)
	for _, err := range errs {
		if err != nil {
			log.Warn().Msgf("Cannot process some actions for %s: %v, skipping",
				agentID.NodeID, err)
		}
	}

	res := ctl.AgentControls{
		BeatRateSec: 30 * ingesters.PushBack.Load(),
		Commands:    actions,
	}
	err = httpext.JSON(w, http.StatusOK, res)
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

	var agentID model.InitAgentReq

	err = json.Unmarshal(data, &agentID)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	err = controls.CompleteAgentUpgrade(ctx, agentID.Version, agentID.NodeID, agentID.NodeType)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	actions, err := controls.GetPendingAgentScans(ctx, agentID.NodeID, agentID.AvailableWorkload, h.TTLCache)
	if err != nil {
		log.Warn().Msgf("Cannot get actions: %s, skipping", err)
	}

	res := ctl.AgentControls{
		BeatRateSec: 30 * ingesters.PushBack.Load(),
		Commands:    actions,
	}
	err = httpext.JSON(w, http.StatusOK, res)
	if err != nil {
		log.Error().Msgf("Cannot send controls: %v", err)
		w.WriteHeader(http.StatusGone)
		return
	}
}

func (h *Handler) ScheduleAgentUpgrade(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	data, err := io.ReadAll(r.Body)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	var agentUp model.AgentUpgrade

	err = json.Unmarshal(data, &agentUp)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	action, err := controls.PrepareAgentUpgradeAction(ctx, agentUp.Version)
	if err != nil {
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	err = controls.ScheduleAgentUpgrade(ctx, agentUp.Version, agentUp.NodeIDs, action)
	if err != nil {
		log.Error().Msgf("Cannot schedule agent upgrade: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *Handler) ScheduleAgentPluginsEnable(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	data, err := io.ReadAll(r.Body)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	var agentUp model.AgentPluginEnable

	err = json.Unmarshal(data, &agentUp)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	url, err := controls.GetAgentPluginVersionTarball(ctx, agentUp.Version, agentUp.PluginName)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	internalReq := ctl.EnableAgentPluginRequest{
		BinURL:     url,
		Version:    agentUp.Version,
		PluginName: agentUp.PluginName,
	}

	b, err := json.Marshal(internalReq)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	action := ctl.Action{
		ID:             ctl.StartAgentUpgrade,
		RequestPayload: string(b),
	}

	err = controls.ScheduleAgentPluginEnable(ctx, agentUp.Version, agentUp.PluginName, []string{agentUp.NodeID}, action)
	if err != nil {
		log.Error().Msgf("Cannot schedule agent upgrade: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *Handler) ScheduleAgentPluginsDisable(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	data, err := io.ReadAll(r.Body)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	var agentUp model.AgentPluginDisable

	err = json.Unmarshal(data, &agentUp)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	internalReq := ctl.DisableAgentPluginRequest{
		PluginName: agentUp.PluginName,
	}

	b, err := json.Marshal(internalReq)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	action := ctl.Action{
		ID:             ctl.StartAgentUpgrade,
		RequestPayload: string(b),
	}

	err = controls.ScheduleAgentPluginDisable(ctx, agentUp.PluginName, []string{agentUp.NodeID}, action)
	if err != nil {
		log.Error().Msgf("Cannot schedule agent upgrade: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}
