package handler

import (
	"net/http"
	"strconv"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) GetScheduledTask(w http.ResponseWriter, r *http.Request) {
	scheduledTasks, err := model.GetScheduledTask(r.Context())
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = httpext.JSON(w, http.StatusOK, scheduledTasks)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) UpdateScheduledTask(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	defer r.Body.Close()
	var req model.UpdateScheduledTaskRequest
	err = httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(err, w)
		return
	}
	req.ID = id
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	err = model.UpdateScheduledTask(r.Context(), id, req)
	if err != nil {
		h.respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteCustomScheduledTask(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	defer r.Body.Close()
	err = model.DeleteCustomSchedule(r.Context(), id)
	if err != nil {
		h.respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) AddScheduledTask(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var req model.AddScheduledTaskRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("Failed to DecodeJSON: %v", err)
		h.respondError(err, w)
		return
	}

	err = h.Validator.Struct(req)
	if err != nil {
		log.Info().Msgf("Error(AddScheduledTask) in struct validation: %v", err)
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	err = model.AddScheduledTask(r.Context(), req)
	if err != nil {
		log.Error().Msgf("Error(AddScheduledTask) adding task to postgres..: %v", err)
		h.respondError(err, w)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
