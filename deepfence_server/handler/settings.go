package handler

import (
	api_messages "github.com/deepfence/ThreatMapper/deepfence_server/constants/api-messages"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"net/http"
	"strconv"
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

func (h *Handler) GetGlobalSettings(w http.ResponseWriter, r *http.Request) {
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(err, w)
		return
	}
	settings, err := model.GetVisibleSettings(ctx, pgClient)
	if err != nil {
		respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, settings)
}

func (h *Handler) UpdateGlobalSettings(w http.ResponseWriter, r *http.Request) {
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(err, w)
		return
	}
	settingId, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	defer r.Body.Close()
	var req model.SettingUpdateRequest
	err = httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		respondError(err, w)
		return
	}
	req.ID = settingId
	err = h.Validator.Struct(req)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return
	}
	pgSettings, err := model.GetSettingByKey(ctx, pgClient, req.Key)
	if err != nil {
		respondError(err, w)
		return
	}
	// TODO: validation for each key
	setting := model.Setting{
		ID: req.ID,
		Value: &model.SettingValue{
			Label:       req.Label,
			Value:       req.Value,
			Description: req.Description,
		},
		IsVisibleOnUi: pgSettings.IsVisibleOnUi,
	}
	err = setting.Update(ctx, pgClient)
	if err != nil {
		respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
