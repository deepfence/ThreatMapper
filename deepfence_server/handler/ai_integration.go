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

func (h *Handler) AddAiIntegration(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.AddAiIntegrationRequest
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

	obj, err := ai_integration.NewAiIntegration(ctx, req.IntegrationType, req.ApiKey)
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

	arg := postgresqlDb.CreateAiIntegrationParams{
		IntegrationType: req.IntegrationType,
		Config:          bConfig,
		CreatedByUserID: user.ID,
	}
	dbIntegration, err := pgClient.CreateAiIntegration(ctx, arg)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}

	h.AuditUserActivity(r, EVENT_AI_INTEGRATION, ACTION_CREATE, map[string]interface{}{"integration_type": req.IntegrationType}, true)

	err = pgClient.UpdateAiIntegrationDefault(ctx, dbIntegration.ID)
	if err != nil {
		log.Warn().Msgf(err.Error())
	}

	err = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessIntegrationCreated})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) GetAiIntegrations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}
	aiIntegrations, err := pgClient.GetAiIntegrations(ctx)
	if err != nil {
		log.Error().Err(err).Msg("GetAiIntegrations")
		h.respondError(&InternalServerError{err}, w)
		return
	}

	integrationList := []model.AiIntegrationListResponse{}

	for _, integration := range aiIntegrations {
		var integrationStatus string
		if integration.ErrorMsg.Valid {
			integrationStatus = integration.ErrorMsg.String
		}
		integrationList = append(integrationList, model.AiIntegrationListResponse{
			ID:                 integration.ID,
			IntegrationType:    integration.IntegrationType,
			Label:              model.AiIntegrationTypeLabel[integration.IntegrationType],
			LastErrorMsg:       integrationStatus,
			DefaultIntegration: integration.DefaultIntegration,
		})
	}

	err = httpext.JSON(w, http.StatusOK, integrationList)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SetDefaultAiIntegration(w http.ResponseWriter, r *http.Request) {
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

	err = pgClient.UpdateAiIntegrationDefault(ctx, int32(idInt))
	if err != nil {
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EVENT_AI_INTEGRATION, ACTION_UPDATE,
		map[string]interface{}{"integration_id": id}, true)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteAiIntegration(w http.ResponseWriter, r *http.Request) {
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

	deletedIntegration, err := pgClient.DeleteAiIntegration(ctx, int32(idInt))
	if err != nil {
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EVENT_AI_INTEGRATION, ACTION_DELETE,
		map[string]interface{}{"integration_id": id}, true)

	if deletedIntegration.DefaultIntegration == true {
		err = pgClient.UpdateAiIntegrationFirstRowDefault(ctx)
		if err != nil {
			log.Warn().Msg(err.Error())
		}
	}

	w.WriteHeader(http.StatusNoContent)

}

func (h *Handler) AiIntegrationCloudPostureQuery(w http.ResponseWriter, r *http.Request) {
	AiIntegrationQueryHandler[model.AiIntegrationCloudPostureRequest](w, r, h)
}

func (h *Handler) AiIntegrationLinuxPostureQuery(w http.ResponseWriter, r *http.Request) {
	AiIntegrationQueryHandler[model.AiIntegrationLinuxPostureRequest](w, r, h)
}

func (h *Handler) AiIntegrationKubernetesPostureQuery(w http.ResponseWriter, r *http.Request) {
	AiIntegrationQueryHandler[model.AiIntegrationKubernetesPostureRequest](w, r, h)
}

func (h *Handler) AiIntegrationVulnerabilityQuery(w http.ResponseWriter, r *http.Request) {
	AiIntegrationQueryHandler[model.AiIntegrationVulnerabilityRequest](w, r, h)
}

func AiIntegrationQueryHandler[T model.AiIntegrationRequest](w http.ResponseWriter, r *http.Request, h *Handler) {
	defer r.Body.Close()
	var req T
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
	if req.GetIntegrationType() == "" {
		dbIntegration, err = pgClient.GetDefaultAiIntegration(ctx)
		if err != nil {
			h.respondError(err, w)
			return
		}
	} else {
		dbIntegration, err = pgClient.GetAiIntegrationFromType(ctx, req.GetIntegrationType())
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
	integration, err := ai_integration.NewAiIntegrationFromDbEntry(ctx, req.GetIntegrationType(), dbIntegration.Config)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = integration.DecryptSecret(aes)
	if err != nil {
		h.respondError(err, w)
		return
	}
	var query string
	switch req.GetRequestType() {
	case model.CloudPostureQuery:
		query, err = integration.GenerateCloudPostureQuery(req)
	case model.LinuxPostureQuery:
		query, err = integration.GenerateLinuxPostureQuery(req)
	case model.KubernetesPostureQuery:
		query, err = integration.GenerateKubernetesPostureQuery(req)
	case model.VulnerabilityQuery:
		query, err = integration.GenerateVulnerabilityQuery(req)
	}
	if err != nil {
		h.respondError(err, w)
		return
	}

	queryResponseChannel := make(chan string, 20)
	flusher, ok := w.(http.Flusher)
	if !ok {
		h.respondError(streamUnsupportedError, w)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	writeDoneChannel := make(chan bool, 1)
	go func() {
		for {
			for queryResponse := range queryResponseChannel {
				if queryResponse == model.AiIntegrationExitMessage {
					writeDoneChannel <- true
					return
				}
				_, err = w.Write([]byte(queryResponse))
				if err != nil {
					log.Warn().Msg(err.Error())
					return
				}
				flusher.Flush()
			}
		}
	}()

	go func() {
		err = integration.Message(ctx, query, queryResponseChannel)
		if err != nil {
			log.Warn().Msg(err.Error())
		}
		queryResponseChannel <- model.AiIntegrationExitMessage
	}()

	for {
		select {
		case <-writeDoneChannel:
			return
		case <-ctx.Done():
			return
		}
	}
}
