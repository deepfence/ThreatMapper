package handler

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/rs/zerolog/log"
)

var (
	licenseAddedError         = ForbiddenError{errors.New("license key already added")}
	licenseNotConfiguredError = BadDecoding{errors.New("license not registered")}
)

func (h *Handler) GenerateLicenseHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.GenerateLicenseRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	message, err := model.GenerateLicense(req)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	err = httpext.JSON(w, http.StatusOK, message)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) RegisterLicenseHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.RegisterLicenseRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(err, w)
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
	dbLicense, err := model.GetLicense(ctx, pgClient)
	if errors.Is(err, sql.ErrNoRows) {
		// Nothing to do
	} else if err != nil {
		h.respondError(err, w)
		return
	} else {
		if dbLicense.LicenseKey != req.LicenseKey {
			h.respondError(&licenseAddedError, w)
			return
		}
	}
	license, err := model.FetchLicense(req.LicenseKey)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = license.Save(ctx, pgClient)
	if err != nil {
		h.respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetLicenseHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	currentUser, statusCode, pgClient, err := h.GetUserFromJWT(ctx)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	license, err := model.GetLicense(ctx, pgClient)
	if errors.Is(err, sql.ErrNoRows) {
		h.respondError(&licenseNotConfiguredError, w)
		return
	} else if err != nil {
		h.respondError(err, w)
		return
	}
	switch currentUser.Role {
	case model.ReadOnlyRole:
		license.LicenseKey = ""
		license.RegistryCredentials = model.RegistryCredentials{}
	case model.StandardUserRole:
		license.LicenseKey = ""
	}
	err = httpext.JSON(w, http.StatusOK, license)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}
