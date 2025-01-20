package handler

import (
	"net/http"
	"strconv"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) GetDeepfenceCommunication(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&InternalServerError{err}, w)
		return
	}

	messages := []model.DeepfenceCommunication{}
	deepfenceCommunication, err := pgClient.GetUnreadDeepfenceCommunication(ctx)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&InternalServerError{err}, w)
		return
	}
	for _, m := range deepfenceCommunication {
		messages = append(messages, model.DeepfenceCommunication{
			ID:            m.ID,
			Title:         m.Title,
			Content:       m.Content,
			Link:          m.Link,
			LinkTitle:     m.LinkTitle,
			ButtonContent: m.ButtonContent,
			Read:          m.Read,
			CreatedAt:     m.CreatedAt,
			UpdatedAt:     m.UpdatedAt,
		})
	}
	err = httpext.JSON(w, http.StatusOK, messages)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) MarkDeepfenceCommunicationAsRead(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	messageID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}
	req := model.DeepfenceCommunicationID{
		ID: messageID,
	}
	err = h.Validator.Struct(req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&InternalServerError{err}, w)
		return
	}
	err = pgClient.MarkDeepfenceCommunicationRead(ctx, req.ID)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
