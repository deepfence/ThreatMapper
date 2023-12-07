package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	api_messages "github.com/deepfence/ThreatMapper/deepfence_server/constants/api-messages"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	generative_ai_integration "github.com/deepfence/ThreatMapper/deepfence_server/pkg/generative-ai-integration"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/generative-ai-integration/bedrock"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

var (
	ErrStreamUnsupported             = errors.New("streaming unsupported")
	ErrGenerativeAIIntegrationExists = BadDecoding{
		err: errors.New("similar integration already exists"),
	}
)

func (h *Handler) AddGenerativeAIIntegrationUsingIAMRole(w http.ResponseWriter, r *http.Request) {
	// Only AWS at the moment
	foundModel, err := bedrock.CheckBedrockModelAvailability()
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}
	if !foundModel {
		h.respondError(&BadDecoding{err: bedrock.ErrBedrockNoActiveModel}, w)
		return
	}

	worker, err := directory.Worker(r.Context())
	if err != nil {
		h.respondError(err, w)
		return
	}
	user, statusCode, _, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	data := utils.AutoFetchGenerativeAIIntegrationsParameters{
		CloudProvider: "aws",
		UserID:        user.ID,
	}
	dataJSON, err := json.Marshal(data)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = worker.Enqueue(utils.AutoFetchGenerativeAIIntegrations, dataJSON, utils.DefaultTaskOpts()...)
	if err != nil {
		h.respondError(err, w)
		return
	}

	w.WriteHeader(http.StatusAccepted)
}

func (h *Handler) AddOpenAiIntegration(w http.ResponseWriter, r *http.Request) {
	AddGenerativeAiIntegration[model.AddGenerativeAiOpenAIIntegration](w, r, h)
}

func (h *Handler) AddBedrockIntegration(w http.ResponseWriter, r *http.Request) {
	AddGenerativeAiIntegration[model.AddGenerativeAiBedrockIntegration](w, r, h)
}

func AddGenerativeAiIntegration[T model.AddGenerativeAiIntegrationRequest](w http.ResponseWriter, r *http.Request, h *Handler) {
	defer r.Body.Close()
	var req T
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

	obj, err := generative_ai_integration.NewGenerativeAiIntegration(ctx, req)
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
		h.respondError(&ErrGenerativeAIIntegrationExists, w)
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

	arg := postgresqlDb.CreateGenerativeAiIntegrationParams{
		IntegrationType: req.GetIntegrationType(),
		Label:           req.GetLabel(),
		Config:          bConfig,
		CreatedByUserID: user.ID,
	}
	dbIntegration, err := pgClient.CreateGenerativeAiIntegration(ctx, arg)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}

	h.AuditUserActivity(r, EventGenerativeAIIntegration, ActionCreate, map[string]interface{}{"integration_type": req.GetIntegrationType()}, true)

	err = pgClient.UpdateGenerativeAiIntegrationDefault(ctx, dbIntegration.ID)
	if err != nil {
		log.Warn().Msgf(err.Error())
	}

	err = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessIntegrationCreated})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) GetGenerativeAiIntegrations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	request := model.GenerativeAiIntegrationListRequest{
		IntegrationType: r.URL.Query().Get("integration_type"),
	}
	err := h.Validator.Struct(request)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}

	var generativeAiIntegrations []postgresqlDb.GenerativeAiIntegration

	if request.IntegrationType == "" {
		generativeAiIntegrations, err = pgClient.GetGenerativeAiIntegrations(ctx)
	} else {
		generativeAiIntegrations, err = pgClient.GetGenerativeAiIntegrationByType(ctx, request.IntegrationType)
	}
	if err != nil {
		log.Error().Err(err).Msg("GetGenerativeAiIntegrations")
		h.respondError(&InternalServerError{err}, w)
		return
	}

	integrationList := []model.GenerativeAiIntegrationListResponse{}

	for _, integration := range generativeAiIntegrations {
		var integrationStatus string
		if integration.ErrorMsg.Valid {
			integrationStatus = integration.ErrorMsg.String
		}
		integrationList = append(integrationList, model.GenerativeAiIntegrationListResponse{
			ID:                 integration.ID,
			IntegrationType:    integration.IntegrationType,
			Label:              integration.Label,
			LastErrorMsg:       integrationStatus,
			DefaultIntegration: integration.DefaultIntegration,
		})
	}

	err = httpext.JSON(w, http.StatusOK, integrationList)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) SetDefaultGenerativeAiIntegration(w http.ResponseWriter, r *http.Request) {
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

	err = pgClient.UpdateGenerativeAiIntegrationDefault(ctx, int32(idInt))
	if err != nil {
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EventGenerativeAIIntegration, ActionUpdate,
		map[string]interface{}{"integration_id": id}, true)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteGenerativeAiIntegration(w http.ResponseWriter, r *http.Request) {
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

	deletedIntegration, err := pgClient.DeleteGenerativeAiIntegration(ctx, int32(idInt))
	if err != nil {
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EventGenerativeAIIntegration, ActionDelete,
		map[string]interface{}{"integration_id": id}, true)

	if deletedIntegration.DefaultIntegration {
		err = pgClient.UpdateGenerativeAiIntegrationFirstRowDefault(ctx)
		if err != nil {
			log.Warn().Msg(err.Error())
		}
	}

	w.WriteHeader(http.StatusNoContent)

}

func (h *Handler) GenerativeAiIntegrationCloudPostureQuery(w http.ResponseWriter, r *http.Request) {
	GenerativeAiIntegrationQueryHandler[model.GenerativeAiIntegrationCloudPostureRequest](w, r, h)
}

func (h *Handler) GenerativeAiIntegrationLinuxPostureQuery(w http.ResponseWriter, r *http.Request) {
	GenerativeAiIntegrationQueryHandler[model.GenerativeAiIntegrationLinuxPostureRequest](w, r, h)
}

func (h *Handler) GenerativeAiIntegrationKubernetesPostureQuery(w http.ResponseWriter, r *http.Request) {
	GenerativeAiIntegrationQueryHandler[model.GenerativeAiIntegrationKubernetesPostureRequest](w, r, h)
}

func (h *Handler) GenerativeAiIntegrationVulnerabilityQuery(w http.ResponseWriter, r *http.Request) {
	GenerativeAiIntegrationQueryHandler[model.GenerativeAiIntegrationVulnerabilityRequest](w, r, h)
}

func (h *Handler) GenerativeAiIntegrationSecretQuery(w http.ResponseWriter, r *http.Request) {
	GenerativeAiIntegrationQueryHandler[model.GenerativeAiIntegrationSecretRequest](w, r, h)
}

func (h *Handler) GenerativeAiIntegrationMalwareQuery(w http.ResponseWriter, r *http.Request) {
	GenerativeAiIntegrationQueryHandler[model.GenerativeAiIntegrationMalwareRequest](w, r, h)
}

func GenerativeAiIntegrationQueryHandler[T model.GenerativeAiIntegrationRequest](w http.ResponseWriter, r *http.Request, h *Handler) {
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

	var dbIntegration postgresqlDb.GenerativeAiIntegration
	if req.GetIntegrationID() == 0 {
		dbIntegration, err = pgClient.GetDefaultGenerativeAiIntegration(ctx)
		if err != nil {
			h.respondError(err, w)
			return
		}
	} else {
		dbIntegration, err = pgClient.GetGenerativeAiIntegrationFromID(ctx, req.GetIntegrationID())
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
	integration, err := generative_ai_integration.NewGenerativeAiIntegrationFromDBEntry(ctx, dbIntegration.IntegrationType, dbIntegration.Config)
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
	case model.SecretQuery:
		query, err = integration.GenerateSecretQuery(req)
	case model.MalwareQuery:
		query, err = integration.GenerateMalwareQuery(req)
	}
	if err != nil {
		h.respondError(err, w)
		return
	}

	queryResponseChannel := make(chan string, 20)
	flusher, ok := w.(http.Flusher)
	if !ok {
		h.respondError(ErrStreamUnsupported, w)
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
				if queryResponse == model.GenerativeAiIntegrationExitMessage {
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

			err = pgClient.UpdateGenerativeAiIntegrationStatus(ctx, postgresqlDb.UpdateGenerativeAiIntegrationStatusParams{
				ID: dbIntegration.ID,
				ErrorMsg: sql.NullString{
					String: err.Error(),
					Valid:  true,
				},
			})
			if err != nil {
				log.Error().Msg(err.Error())
			}
		} else {
			err = pgClient.UpdateGenerativeAiIntegrationStatus(ctx, postgresqlDb.UpdateGenerativeAiIntegrationStatusParams{
				ID:       dbIntegration.ID,
				ErrorMsg: sql.NullString{},
			})
			if err != nil {
				log.Error().Msg(err.Error())
			}
		}
		queryResponseChannel <- model.GenerativeAiIntegrationExitMessage
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
