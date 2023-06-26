package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	api_messages "github.com/deepfence/ThreatMapper/deepfence_server/constants/api-messages"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
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
	// don't log secrets in audit log
	req.Password = ""
	req.AmazonAccessKey = ""
	req.AmazonSecretKey = ""
	h.AuditUserActivity(r, EVENT_SETTINGS, ACTION_CREATE, req, true)
	httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessEmailConfigCreated})
}

func (h *Handler) GetEmailConfiguration(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(&InternalServerError{err}, w)
		return
	}
	resp := []model.EmailConfigurationResp{}
	setting, err := pgClient.GetSetting(ctx, model.EmailConfigurationKey)
	if errors.Is(err, sql.ErrNoRows) {
		httpext.JSON(w, http.StatusOK, resp)
		return
	} else if err != nil {
		respondError(&InternalServerError{err}, w)
		return
	}
	var emailConfig model.EmailConfigurationResp
	err = json.Unmarshal(setting.Value, &emailConfig)
	if err != nil {
		respondError(&InternalServerError{err}, w)
		return
	}
	emailConfig.ID = setting.ID
	resp = append(resp, emailConfig)
	httpext.JSON(w, http.StatusOK, resp)
}

func (h *Handler) DeleteEmailConfiguration(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(&InternalServerError{err}, w)
		return
	}
	configId, err := strconv.ParseInt(chi.URLParam(r, "config_id"), 10, 64)
	if err != nil {
		respondError(&InternalServerError{err}, w)
		return
	}
	err = pgClient.DeleteSettingByID(ctx, configId)
	if err != nil {
		respondError(&InternalServerError{err}, w)
		return
	}
	h.AuditUserActivity(r, EVENT_SETTINGS, ACTION_DELETE,
		map[string]interface{}{"config_id": configId}, true)
	w.WriteHeader(http.StatusNoContent)
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
		respondError(&ValidatorError{err: err}, w)
		return
	}
	currentSettings, err := model.GetSettingByKey(ctx, pgClient, req.Key)
	if err != nil {
		respondError(err, w)
		return
	}
	if req.ID != currentSettings.ID {
		respondError(&ValidatorError{
			err: errors.New("Key: 'SettingUpdateRequest.ID' Error:invalid id"), skipOverwriteErrorMessage: true}, w)
		return
	}
	var value interface{}
	switch currentSettings.Key {
	case model.ConsoleURLSettingKey:
		var parsedUrl *url.URL
		if parsedUrl, err = url.ParseRequestURI(strings.TrimSpace(req.Value)); err != nil {
			respondError(&ValidatorError{
				err: errors.New("Key: 'SettingUpdateRequest.Value' Error:invalid url"), skipOverwriteErrorMessage: true}, w)
			return
		}
		value = parsedUrl.Scheme + "://" + parsedUrl.Host
	case model.InactiveNodesDeleteScanResultsKey:
		value, err = strconv.ParseInt(strings.TrimSpace(req.Value), 10, 64)
		if err != nil {
			respondError(&ValidatorError{
				err: errors.New("Key: 'SettingUpdateRequest.Value' Error:must be integer"), skipOverwriteErrorMessage: true}, w)
			return
		}
	}
	setting := model.Setting{
		ID:  req.ID,
		Key: req.Key,
		Value: &model.SettingValue{
			Label:       currentSettings.Value.Label,
			Value:       value,
			Description: currentSettings.Value.Description,
		},
		IsVisibleOnUi: currentSettings.IsVisibleOnUi,
	}
	err = setting.Update(ctx, pgClient)
	if err != nil {
		respondError(err, w)
		return
	}
	h.AuditUserActivity(r, EVENT_SETTINGS, ACTION_UPDATE, setting, true)
	w.WriteHeader(http.StatusNoContent)
}
