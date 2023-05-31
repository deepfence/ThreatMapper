package handler

import (
	"net/http"
	"strconv"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) GetScheduledTask(w http.ResponseWriter, r *http.Request) {
	ctx := directory.WithGlobalContext(r.Context())
	scheduledTasks, err := model.GetScheduledTask(ctx)
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
	ctx := directory.WithGlobalContext(r.Context())
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
	err = model.UpdateScheduledTask(ctx, id, req)
	if err != nil {
		respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
