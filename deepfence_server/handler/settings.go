package handler

import (
	api_messages "github.com/deepfence/ThreatMapper/deepfence_server/constants/api-messages"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"net/http"
)

func (h *Handler) AddEmailConfiguration(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.EmailConfigurationAdd
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}
	user, statusCode, _, _, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}
	req.CreatedByUserID = user.ID
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(&InternalServerError{err}, w)
		return
	}
	err = req.Create(r.Context(), pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}
	httpext.JSON(w, http.StatusOK, api_messages.SuccessEmailConfigCreated)
}

func (h *Handler) GetEmailConfiguration(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var resp []model.EmailConfigurationResp
	resp = append(resp, model.EmailConfigurationResp{
		EmailProvider:   "smtp",
		CreatedByUserID: 23,
		EmailID:         "saurabh@deepfence.io",
		Smtp:            "smtp.gmail.com",
		Port:            "554",
		SesRegion:       "",
	})
	httpext.JSON(w, http.StatusOK, resp)
}
