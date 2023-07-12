package handler

import (
	"net/http"
	"strconv"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) GetScheduledTask(w http.ResponseWriter, r *http.Request) {
	scheduledTasks, err := model.GetScheduledTask(r.Context())
	if err != nil {
		respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, scheduledTasks)
}

func (h *Handler) UpdateScheduledTask(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	defer r.Body.Close()
	var req model.UpdateScheduledTaskRequest
	err = httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		respondError(err, w)
		return
	}
	req.ID = id
	err = h.Validator.Struct(req)
	if err != nil {
		respondError(&ValidatorError{err: err}, w)
		return
	}
	err = model.UpdateScheduledTask(r.Context(), id, req)
	if err != nil {
		respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
