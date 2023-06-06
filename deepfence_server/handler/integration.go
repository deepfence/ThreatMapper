package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"

	api_messages "github.com/deepfence/ThreatMapper/deepfence_server/constants/api-messages"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) AddIntegration(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.IntegrationAddReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	// identify integration and interface it
	b, err := json.Marshal(req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}
	obj, err := integration.GetIntegration(req.IntegrationType, b)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}
	err = obj.ValidateConfig(h.Validator)
	if err != nil {
		respondError(&ValidatorError{err: err}, w)
		return
	}

	// add integration to database
	// before that check if integration already exists
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(&InternalServerError{err}, w)
		return
	}
	integrationExists, err := req.IntegrationExists(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}
	if integrationExists {
		httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrIntegrationExists})
		return
	}

	// check if integration is valid
	/*err = i.SendNotification("validating integration")
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&ValidatorError{err: err}, w)
		return
	}*/

	user, statusCode, _, _, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}

	// store the integration in db
	err = req.CreateIntegration(ctx, pgClient, user.ID)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}

	h.AuditUserActivity(r, EVENT_INTEGRATION, ACTION_CREATE, req, true)

	httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessIntegrationCreated})

}

func (h *Handler) GetIntegrations(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.IntegrationListReq
	httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(&InternalServerError{err}, w)
		return
	}
	integrations, err := req.GetIntegrations(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}

	integrationList := []model.IntegrationListResp{}
	for _, integration := range integrations {
		var config map[string]interface{}
		var filters reporters.FieldsFilters

		err = json.Unmarshal(integration.Config, &config)
		if err != nil {
			log.Error().Msgf(err.Error())
			respondError(&InternalServerError{err}, w)
			return
		}
		err = json.Unmarshal(integration.Filters, &filters)
		if err != nil {
			log.Error().Msgf(err.Error())
			respondError(&InternalServerError{err}, w)
			return
		}
		newIntegration := model.IntegrationListResp{
			ID:               integration.ID,
			IntegrationType:  integration.IntegrationType,
			NotificationType: integration.Resource,
			Config:           config,
			Filters:          filters,
		}

		newIntegration.RedactSensitiveFieldsInConfig()
		integrationList = append(integrationList, newIntegration)
	}

	httpext.JSON(w, http.StatusOK, integrationList)
}

func (h *Handler) DeleteIntegration(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "integration_id")

	// id to int32
	idInt, err := strconv.ParseInt(id, 10, 32)

	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&InternalServerError{err}, w)
		return
	}

	err = model.DeleteIntegration(ctx, pgClient, int32(idInt))
	if err != nil {
		log.Error().Msg(err.Error())
		respondError(err, w)
	}

	h.AuditUserActivity(r, EVENT_INTEGRATION, ACTION_DELETE,
		map[string]interface{}{"integration_id": id}, true)

	w.WriteHeader(http.StatusNoContent)

}
