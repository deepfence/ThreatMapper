package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
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

var (
	errInvalidID              = BadDecoding{err: errors.New("invalid id")}
	errInvalidURL             = BadDecoding{err: errors.New("invalid url")}
	errInvalidInteger         = BadDecoding{err: errors.New("must be integer")}
	errInvalidEmailConfigType = ValidatorError{
		err: fmt.Errorf("email_provider:must be %s or %s", model.EmailSettingSMTP, model.EmailSettingSES), skipOverwriteErrorMessage: true}
)

func (h *Handler) AddEmailConfiguration(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.EmailConfigurationAdd
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}
	switch req.EmailProvider {
	case model.EmailSettingSMTP:
		err = h.Validator.Struct(model.EmailConfigurationSMTP{
			EmailID:  req.EmailID,
			SMTP:     req.SMTP,
			Port:     req.Port,
			Password: req.Password,
		})
	case model.EmailSettingSES:
		err = h.Validator.Struct(model.EmailConfigurationSES{
			EmailID:         req.EmailID,
			AmazonAccessKey: req.AmazonAccessKey,
			AmazonSecretKey: req.AmazonSecretKey,
			SesRegion:       req.SesRegion,
		})
	default:
		h.respondError(&errInvalidEmailConfigType, w)
		return
	}
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	ctx := r.Context()
	user, statusCode, _, err := h.GetUserFromJWT(ctx)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	req.CreatedByUserID = user.ID
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}
	err = req.Create(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}
	// don't log secrets in audit log
	req.Password = ""
	req.AmazonAccessKey = ""
	req.AmazonSecretKey = ""
	h.AuditUserActivity(r, EventSettings, ActionCreate, req, true)
	err = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessEmailConfigCreated})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) GetEmailConfiguration(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}
	resp := []model.EmailConfigurationResp{}
	setting, err := pgClient.GetSetting(ctx, model.EmailConfigurationKey)
	if errors.Is(err, sql.ErrNoRows) {
		err = httpext.JSON(w, http.StatusOK, resp)
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		return
	} else if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}
	var emailConfig model.EmailConfigurationResp
	err = json.Unmarshal(setting.Value, &emailConfig)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}
	emailConfig.ID = setting.ID
	resp = append(resp, emailConfig)
	err = httpext.JSON(w, http.StatusOK, resp)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) DeleteEmailConfiguration(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}
	configID, err := strconv.ParseInt(chi.URLParam(r, "config_id"), 10, 64)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}
	err = pgClient.DeleteSettingByID(ctx, configID)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}
	h.AuditUserActivity(r, EventSettings, ActionDelete,
		map[string]interface{}{"config_id": configID}, true)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetGlobalSettings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(err, w)
		return
	}
	settings, err := model.GetVisibleSettings(ctx, pgClient)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = httpext.JSON(w, http.StatusOK, settings)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) UpdateGlobalSettings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(err, w)
		return
	}
	settingID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	defer r.Body.Close()
	var req model.SettingUpdateRequest
	err = httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(err, w)
		return
	}
	req.ID = settingID
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	currentSettings, err := model.GetSettingByKey(ctx, pgClient, req.Key)
	if err != nil {
		h.respondError(err, w)
		return
	}
	if req.ID != currentSettings.ID {
		h.respondError(&errInvalidID, w)
		return
	}
	var value interface{}
	switch currentSettings.Key {
	case model.ConsoleURLSettingKey, model.FileServerURLSettingKey:
		var parsedURL *url.URL
		if parsedURL, err = url.ParseRequestURI(strings.TrimSpace(req.Value)); err != nil {
			h.respondError(&errInvalidURL, w)
			return
		}
		if !strings.Contains(parsedURL.Host, ".") {
			h.respondError(&errInvalidURL, w)
			return
		}
		value = parsedURL.Scheme + "://" + parsedURL.Host
	case model.InactiveNodesDeleteScanResultsKey:
		value, err = strconv.ParseInt(strings.TrimSpace(req.Value), 10, 64)
		if err != nil {
			h.respondError(&errInvalidInteger, w)
			return
		}
	default:
		value = req.Value
	}
	setting := model.Setting{
		ID:  req.ID,
		Key: req.Key,
		Value: &model.SettingValue{
			Label:       currentSettings.Value.Label,
			Value:       value,
			Description: currentSettings.Value.Description,
		},
		IsVisibleOnUI: currentSettings.IsVisibleOnUI,
	}
	err = setting.Update(ctx, pgClient)
	if err != nil {
		h.respondError(err, w)
		return
	}
	h.AuditUserActivity(r, EventSettings, ActionUpdate, setting, true)
	w.WriteHeader(http.StatusNoContent)
}
