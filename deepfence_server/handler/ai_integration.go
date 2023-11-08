package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	api_messages "github.com/deepfence/ThreatMapper/deepfence_server/constants/api-messages"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	ai_integration "github.com/deepfence/ThreatMapper/deepfence_server/pkg/ai-integration"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

var (
	streamUnsupportedError = errors.New("streaming unsupported")
)

func (h *Handler) AddAIIntegration(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.AddAIIntegrationRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}

	obj, err := ai_integration.NewIntegration(ctx, req.IntegrationType, req.ApiKey)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}
	err = obj.ValidateConfig(h.Validator)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	// encrypt secret
	aesValue, err := model.GetAESValueForEncryption(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}
	aes := encryption.AES{}
	err = json.Unmarshal(aesValue, &aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}
	err = obj.EncryptSecret(aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}

	// add integration to database
	// before that check if integration already exists
	integrationExists, err := req.IntegrationExists(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}
	if integrationExists {
		err = httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrIntegrationExists})
		if err != nil {
			log.Error().Msg(err.Error())
		}
		return
	}

	user, statusCode, _, err := h.GetUserFromJWT(ctx)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}

	// store the integration in db
	bConfig, err := json.Marshal(obj)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}

	arg := postgresqlDb.CreateAIIntegrationParams{
		IntegrationType: req.IntegrationType,
		Config:          bConfig,
		CreatedByUserID: user.ID,
	}
	_, err = pgClient.CreateAIIntegration(ctx, arg)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}

	h.AuditUserActivity(r, EVENT_AI_INTEGRATION, ACTION_CREATE, req, true)

	err = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessIntegrationCreated})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) GetAIIntegrations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}
	aiIntegrations, err := pgClient.GetAIIntegrations(ctx)
	if err != nil {
		log.Error().Err(err).Msg("GetAIIntegrations")
		h.respondError(&InternalServerError{err}, w)
		return
	}

	integrationList := []model.AIIntegrationListResponse{}

	for _, integration := range aiIntegrations {
		var integrationStatus string
		if integration.ErrorMsg.Valid {
			integrationStatus = integration.ErrorMsg.String
		}
		integrationList = append(integrationList, model.AIIntegrationListResponse{
			ID:                 integration.ID,
			IntegrationType:    integration.IntegrationType,
			Label:              model.AIIntegrationTypeLabel[integration.IntegrationType],
			LastErrorMsg:       integrationStatus,
			DefaultIntegration: integration.DefaultIntegration,
		})
	}

	err = httpext.JSON(w, http.StatusOK, integrationList)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) DeleteAIIntegration(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "integration_id")

	// id to int32
	idInt, err := strconv.ParseInt(id, 10, 32)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(err, w)
		return
	}

	deletedIntegration, err := pgClient.DeleteAIIntegration(ctx, int32(idInt))
	if err != nil {
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EVENT_AI_INTEGRATION, ACTION_DELETE,
		map[string]interface{}{"integration_id": id}, true)

	if deletedIntegration.DefaultIntegration == true {
		err = pgClient.UpdateAIIntegrationFirstRowDefault(ctx)
		if err != nil {
			log.Warn().Msg(err.Error())
		}
	}

	w.WriteHeader(http.StatusNoContent)

}

func (h *Handler) AIIntegrationCloudPostureQuery(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req ai_integration.AIIntegrationCloudPostureRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}

	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(err, w)
		return
	}

	var dbIntegration postgresqlDb.AiIntegration
	if req.IntegrationType == "" {
		dbIntegration, err = pgClient.GetDefaultAIIntegration(ctx)
		if err != nil {
			h.respondError(err, w)
			return
		}
	} else {
		dbIntegration, err = pgClient.GetAIIntegrationFromType(ctx, req.IntegrationType)
		if err != nil {
			h.respondError(err, w)
			return
		}
	}

	// decrypt secret
	aesValue, err := model.GetAESValueForEncryption(ctx, pgClient)
	if err != nil {
		h.respondError(err, w)
		return
	}

	aes := encryption.AES{}
	err = json.Unmarshal(aesValue, &aes)
	if err != nil {
		h.respondError(err, w)
		return
	}
	integration, err := ai_integration.NewIntegrationFromDbEntry(ctx, req.IntegrationType, dbIntegration.Config)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = integration.DecryptSecret(aes)
	if err != nil {
		h.respondError(err, w)
		return
	}
	query, err := integration.GeneratePostureQuery(req)
	if err != nil {
		h.respondError(err, w)
		return
	}
	queryResponseChannel := make(chan []byte, 10)
	flusher, ok := w.(http.Flusher)
	if !ok {
		h.respondError(streamUnsupportedError, w)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	go func() {
		for {
			for queryResponse := range queryResponseChannel {
				_, err = w.Write(queryResponse)
				if err != nil {
					continue
				}
				flusher.Flush()
			}
		}
	}()
	err = integration.Message(ctx, query, queryResponseChannel)
	if err != nil {
		close(queryResponseChannel)
		h.respondError(err, w)
		return
	}
	close(queryResponseChannel)
}

func (h *Handler) AIIntegrationVulnerabilityQuery(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req ai_integration.AIIntegrationVulnerabilityRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	w.WriteHeader(http.StatusOK)
}
