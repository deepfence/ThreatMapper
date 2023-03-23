package handler

import (
	"encoding/json"
	"net/http"

	api_messages "github.com/deepfence/ThreatMapper/deepfence_server/constants/api-messages"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
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

	i, err := integration.GetIntegration(req.IntegrationType, b)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	// check if integration is valid
	err = i.SendNotification("validating integration")
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&ValidatorError{err}, w)
		return

		// add registry to database
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

		// store the integration in db
		err = req.CreateIntegration(ctx, pgClient)
		if err != nil {
			log.Error().Msgf(err.Error())
			respondError(&InternalServerError{err}, w)
			return
		}
		httpext.JSON(w, http.StatusOK, api_messages.SuccessRegistryCreated)
	}
}
