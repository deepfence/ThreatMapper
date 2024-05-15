package handler

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/rs/zerolog/log"
)

var (
	licenseAddedError         = ForbiddenError{errors.New("license key already added")}
	licenseNotConfiguredError = PaymentRequired{errors.New("console not registered")}
	errEmailRequired          = ValidatorError{
		err:                       errors.New("email:email is required"),
		skipOverwriteErrorMessage: true,
	}
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
	message, errorFields, err := model.GenerateLicense(req)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(&BadDecoding{err: err}, w)
		return
	}
	if len(errorFields) > 0 {
		validatorError := ValidatorError{
			errs:                      []error{},
			skipOverwriteErrorMessage: true,
		}
		for k, v := range errorFields {
			validatorError.errs = append(validatorError.errs, fmt.Errorf("%s:%s", k, v))
		}
		validatorError.err = validatorError.errs[0]
		h.respondError(&validatorError, w)
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
	// Not part of validator to keep RegisterLicenseRequest same in TM and TS
	if req.Email == "" {
		h.respondError(&errEmailRequired, w)
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
	license, statusCode, err := model.FetchLicense(ctx, req.LicenseKey, req.Email, pgClient)
	if err != nil {
		log.Error().Msg(err.Error())
		if statusCode == http.StatusBadRequest {
			h.respondError(&BadDecoding{err: err}, w)
			return
		} else {
			h.respondError(err, w)
			return
		}
	}
	err = license.Save(ctx, pgClient)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}

	err = h.RunThreatIntelUpdateTask(ctx)
	if err != nil {
		log.Warn().Msgf("Could not trigger ThreatIntelUpdateTask: %v", err)
	}

	err = httpext.JSON(w, http.StatusOK, model.RegisterLicenseResponse{
		LicenseKey:  license.LicenseKey,
		EmailDomain: license.LicenseEmailDomain,
	})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) RunThreatIntelUpdateTask(ctx context.Context) error {
	worker, err := directory.Worker(ctx)
	if err != nil {
		return err
	}
	err = worker.Enqueue(utils.ThreatIntelUpdateTask, []byte{}, utils.CritialTaskOpts()...)
	if err != nil {
		return err
	}
	return nil
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

func (h *Handler) DeleteLicenseHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(err, w)
		return
	}
	license, err := model.GetLicense(ctx, pgClient)
	if errors.Is(err, sql.ErrNoRows) {
		h.respondError(&licenseNotConfiguredError, w)
		return
	} else if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}
	err = license.Delete(ctx, pgClient)
	if err != nil {
		log.Error().Msg(err.Error())
		h.respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
