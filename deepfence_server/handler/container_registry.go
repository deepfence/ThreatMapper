package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	api_messages "github.com/deepfence/ThreatMapper/deepfence_server/constants/api-messages"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/gcr"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registrysync"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/encryption"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/samber/mo"
)

var (
	unknownInternalServerError = InternalServerError{errors.New("something went wrong")}
)

func (h *Handler) ListRegistry(w http.ResponseWriter, r *http.Request) {
	var req model.RegistryListReq

	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&InternalServerError{err}, w)
		return
	}
	registries, err := req.ListRegistriesSafe(ctx, pgClient)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&InternalServerError{err}, w)
		return
	}

	registriesResponse := make([]model.RegistryListResp, 0)
	for _, r := range registries {
		reg, err := registry.GetRegistryWithRegistrySafeRow(r)
		if err != nil {
			log.Error().Err(err).Msgf("Fail to unmarshal registry from DB")
			continue
		}
		registryID := utils.GetRegistryID(reg.GetRegistryType(), reg.GetNamespace(), r.ID)
		registryResponse := model.RegistryListResp{
			ID:           r.ID,
			NodeID:       registryID,
			Name:         r.Name,
			RegistryType: r.RegistryType,
			IsSyncing:    req.IsRegistrySyncing(ctx, registryID),
			NonSecret:    r.NonSecret,
			CreatedAt:    r.CreatedAt.Unix(),
			UpdatedAt:    r.UpdatedAt.Unix(),
		}
		registriesResponse = append(registriesResponse, registryResponse)
	}

	err = httpext.JSON(w, http.StatusOK, registriesResponse)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) AddRegistry(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.RegistryAddReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	// identify registry and interface it
	b, err := json.Marshal(req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	registry, err := registry.GetRegistry(req.RegistryType, b)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	// validate fields
	err = registry.ValidateFields(h.Validator)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	// validate if registry credential is correct
	if !registry.IsValidCredential() {
		err = httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryAuthFailed})
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		return
	}

	// add registry to database
	// before that check if registry already exists
	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}
	registryExists, err := req.RegistryExists(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}
	if registryExists {
		err = httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryExists})
		if err != nil {
			log.Error().Msgf("%v", err)
		}

		return
	}

	// encrypt secret
	aesValue, err := model.GetAESValueForEncryption(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}

	// note: we'll encrypt the secret in registry interface object and use its secretgetter
	// to map the secrets with req
	aes := encryption.AES{}
	err = json.Unmarshal(aesValue, &aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}
	err = registry.EncryptSecret(aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&unknownInternalServerError, w)
		return
	}
	req.Secret = registry.GetSecret()
	req.Extras = registry.GetExtras()

	// add to registry db
	pgID, err := req.CreateRegistry(ctx, r.Context(), pgClient, registry.GetNamespace())
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}

	err = h.SyncRegistry(r.Context(), pgID, registry)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}

	// don't log secrets in audit logs
	req.Secret = map[string]interface{}{}
	h.AuditUserActivity(r, EventRegistry, ActionCreate, req, true)

	err = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessRegistryCreated})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

// update registry
func (h *Handler) UpdateRegistry(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.RegistryUpdateReq
	err := httpext.DecodeJSON(r, httpext.QueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	idStr := chi.URLParam(r, "registry_id")
	if idStr == "" {
		err = httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryIDMissing})
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		return
	}

	updateSecret := req.Secret != nil

	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	// before that check if registry exists
	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}
	registryExists, err := req.RegistryExists(ctx, pgClient, int32(id))
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}
	if !registryExists {
		err = httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryNotExists})
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		return
	}

	// identify registry and interface it
	b, err := json.Marshal(req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	registry, err := registry.GetRegistry(req.RegistryType, b)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	// validate fields
	err = registry.ValidateFields(h.Validator)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	// todo: get aes key, has to be a better way to avoid getting this everytime
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
	if !updateSecret {
		// decrypt secret
		err = registry.DecryptSecret(aes)
		if err != nil {
			log.Error().Msgf(err.Error())
			h.respondError(&unknownInternalServerError, w)
			return
		}
	}

	// validate if registry credential is correct
	if !registry.IsValidCredential() {
		err = httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryAuthFailed})
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		return
	}

	// note: we'll encrypt the secret in registry interface object and use its secretgetter
	// to map the secrets with req
	err = registry.EncryptSecret(aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&unknownInternalServerError, w)
		return
	}
	req.Secret = registry.GetSecret()
	req.Extras = registry.GetExtras()

	// update registry db
	err = req.UpdateRegistry(ctx, pgClient, int32(id))
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}

	// don't log secrets in audit logs
	req.Secret = map[string]interface{}{}
	h.AuditUserActivity(r, EventRegistry, ActionUpdate, req, true)

	err = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessRegistryUpdated})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) AddGoogleContainerRegistry(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()
	failureMsg := "Failed to add registry, Error: %s"

	if err := r.ParseMultipartForm(1024 * 1024); err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{fmt.Errorf(failureMsg, err.Error())}, w)
		return
	}

	file, fileHeader, err := r.FormFile("service_account_json")
	if err != nil {
		log.Error().Msgf("%v", err)
		if err == http.ErrMissingFile {
			h.respondError(&BadDecoding{fmt.Errorf(failureMsg, "Missing file")}, w)
		} else {
			h.respondError(&BadDecoding{fmt.Errorf(failureMsg, err.Error())}, w)
		}
		return
	}
	defer file.Close()

	if (fileHeader.Header.Get("Content-Type")) != "application/json" {
		err = httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: "uploaded file is not json"})
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		return
	}

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{fmt.Errorf(failureMsg, err.Error())}, w)
		return
	}

	registryName := r.FormValue("name")
	if registryName == "" {
		err = httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: "registry name cannot be empty"})
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		return
	}

	registryURL := r.FormValue("registry_url")
	if registryName == "" {
		err = httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: "registry url cannot be empty"})
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		return
	}

	var sa gcr.ServiceAccountJSON
	if err := json.Unmarshal(fileBytes, &sa); err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{fmt.Errorf(failureMsg, err.Error())}, w)
		return
	}

	req := model.RegistryAddReq{
		Name:         registryName,
		NonSecret:    map[string]interface{}{"registry_url": registryURL, "project_id": sa.ProjectID},
		Secret:       map[string]interface{}{"private_key_id": sa.PrivateKeyID},
		Extras:       map[string]interface{}{"service_account_json": string(fileBytes)},
		RegistryType: constants.GCR,
	}

	// identify registry and interface it
	b, err := json.Marshal(req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{fmt.Errorf(failureMsg, err.Error())}, w)
		return
	}

	registry, err := registry.GetRegistry(constants.GCR, b)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{fmt.Errorf(failureMsg, err.Error())}, w)
		return
	}

	// validate fields
	err = registry.ValidateFields(h.Validator)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	// validate if registry credential is correct
	if !registry.IsValidCredential() {
		err = httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryAuthFailed})
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		return
	}

	// add registry to database
	// before that check if registry already exists
	ctx := r.Context()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&InternalServerError{err}, w)
		return
	}
	registryExists, err := req.RegistryExists(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}
	if registryExists {
		err = httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryExists})
		if err != nil {
			log.Error().Msgf("%v", err)
		}
		return
	}

	// encrypt secret
	aesValue, err := model.GetAESValueForEncryption(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}

	// note: we'll encrypt the secret in registry interface object and use its secret getter
	// to map the secrets with req
	aes := encryption.AES{}
	err = json.Unmarshal(aesValue, &aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}

	err = registry.EncryptSecret(aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&unknownInternalServerError, w)
		return
	}

	err = registry.EncryptExtras(aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&unknownInternalServerError, w)
		return
	}

	req.Secret = registry.GetSecret()
	req.Extras = registry.GetExtras()

	// add to registry db
	pgID, err := req.CreateRegistry(ctx, r.Context(), pgClient, registry.GetNamespace())
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&InternalServerError{err}, w)
		return
	}

	err = h.SyncRegistry(r.Context(), pgID, registry)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
		return
	}

	h.AuditUserActivity(r, EventRegistry, ActionCreate, req, true)

	err = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessRegistryCreated})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) DeleteRegistryBulk(w http.ResponseWriter, r *http.Request) {
	var req model.DeleteRegistryBulkReq
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

	err = h.deleteRegistryHelper(r.Context(), req.RegistryIds)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EventRegistry, ActionDelete,
		map[string][]string{"registry_ids": req.RegistryIds}, true)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteRegistry(w http.ResponseWriter, r *http.Request) {
	id, err := utils.URLDecode(chi.URLParam(r, "registry_id"))
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	err = h.deleteRegistryHelper(r.Context(), []string{id})
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EventRegistry, ActionDelete,
		map[string]interface{}{"registry_id": id}, true)

	w.WriteHeader(http.StatusNoContent)

}
func (h *Handler) deleteRegistryHelper(ctx context.Context, nodeIDs []string) error {

	ctx, span := telemetry.NewSpan(ctx, "registry", "delete-registry-helper")
	defer span.End()

	pgIDs, err := model.GetRegistryPgIDs(ctx, nodeIDs)
	if err != nil {
		return &NotFoundError{err}
	}

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}

	log.Info().Msgf("delete registry ID's: %v and registry account %s", pgIDs, nodeIDs)

	if err := model.DeleteRegistryAccount(ctx, nodeIDs); err != nil {
		return err
	}

	for _, id := range pgIDs {
		err = model.DeleteRegistry(ctx, pgClient, int32(id))
		if err != nil {
			return err
		}
	}
	return nil
}

func (h *Handler) RefreshRegistry(w http.ResponseWriter, r *http.Request) {
	id, err := utils.URLDecode(chi.URLParam(r, "registry_id"))
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	pgIds, err := model.GetRegistryPgIDs(r.Context(), []string{id})
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&NotFoundError{err}, w)
		return
	}
	syncErrs := []string{}
	for _, p := range pgIds {
		if err := h.SyncRegistry(r.Context(), int32(p), nil); err != nil {
			syncErrs = append(syncErrs, err.Error())
		}
	}
	if len(syncErrs) > 0 {
		err = httpext.JSON(w, http.StatusInternalServerError,
			model.MessageResponse{Message: strings.Join(syncErrs, ",")})
	} else {
		err = httpext.JSON(w, http.StatusOK,
			model.MessageResponse{Message: "started sync registry"})
	}
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) getImages(w http.ResponseWriter, r *http.Request) ([]model.ContainerImage, error) {
	images := []model.ContainerImage{}
	var req model.RegistryImagesReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return images, err
	}
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return images, err
	}

	images, err = model.ListImages(r.Context(), req.RegistryID, req.ImageFilter, req.ImageStubFilter, req.Window)
	if err != nil {
		log.Error().Msgf("failed list images: %v", err)
		h.respondError(err, w)
		return images, err
	}

	log.Info().Msgf("get images for registry id %s found %d images", req.RegistryID, len(images))

	return images, nil
}

func (h *Handler) ListImages(w http.ResponseWriter, r *http.Request) {
	images, err := h.getImages(w, r)

	if err == nil {
		err = httpext.JSON(w, http.StatusOK, images)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func (h *Handler) CountImages(w http.ResponseWriter, r *http.Request) {
	images, err := h.getImages(w, r)

	if err == nil {
		err = httpext.JSON(w, http.StatusOK, model.RegistryCountResp{
			Count: len(images),
		})
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func (h *Handler) getImageStubs(w http.ResponseWriter, r *http.Request) ([]model.ImageStub, error) {
	images := []model.ImageStub{}
	var req model.RegistryImageStubsReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return images, err
	}
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return images, err
	}

	images, err = model.ListImageStubs(r.Context(), req.RegistryID, req.ImageFilter, req.Window)
	if err != nil {
		log.Error().Msgf("failed get stubs %v", err)
		h.respondError(err, w)
		return images, err
	}

	return images, nil
}

func (h *Handler) ListImageStubs(w http.ResponseWriter, r *http.Request) {
	images, err := h.getImageStubs(w, r)
	if err == nil {
		err = httpext.JSON(w, http.StatusOK, images)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func (h *Handler) CountImageStubs(w http.ResponseWriter, r *http.Request) {
	images, err := h.getImageStubs(w, r)
	if err == nil {
		err = httpext.JSON(w, http.StatusOK, model.RegistryCountResp{
			Count: len(images),
		})
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func (h *Handler) RegistrySummary(w http.ResponseWriter, r *http.Request) {

	req := model.RegistryIDPathReq{
		RegistryID: chi.URLParam(r, "registry_id"),
	}
	err := h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	// count registry resource
	counts, err := model.RegistrySummary(r.Context(), mo.Some(req.RegistryID), mo.None[string]())
	if err != nil {
		log.Error().Msgf("failed registry summary: %v", err)
		h.respondError(err, w)
		return
	}

	log.Info().Msgf("registry %s summary %+v", req.RegistryID, counts)

	err = httpext.JSON(w, http.StatusOK, counts)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) SummaryByRegistryType(w http.ResponseWriter, r *http.Request) {

	req := model.RegistryTypeReq{
		RegistryType: chi.URLParam(r, "registry_type"),
	}
	err := h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	// count registry resource
	counts, err := model.RegistrySummary(r.Context(), mo.None[string](), mo.Some(req.RegistryType))
	if err != nil {
		log.Error().Msgf("failed registry summary: %v", err)
		h.respondError(err, w)
		return
	}

	log.Info().Msgf("registries %s summary %+v", req.RegistryType, counts)

	err = httpext.JSON(w, http.StatusOK, counts)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {

	// count registry resource
	counts, err := model.RegistrySummaryAll(r.Context())
	if err != nil {
		log.Error().Msgf("failed registry summary all: %v", err)
		h.respondError(err, w)
		return
	}

	log.Info().Msgf("all registries summary %+v", counts)

	err = httpext.JSON(w, http.StatusOK, counts)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) SyncRegistry(rCtx context.Context, pgID int32, registry registry.Registry) error {
	log.Info().Msgf("sync registry with id=%d", pgID)
	syncStatus := registrysync.SyncStatus{}

	// Set sync=true. Otherwise, the status in UI will be "Ready to scan" when an account was just added,
	// because the asynq job may take some time to start
	if registry != nil {
		syncStatus.Syncing = true
		err := registrysync.SetRegistryAccountSyncing(rCtx, syncStatus, registry, pgID)
		if err != nil {
			log.Warn().Msgf(err.Error())
		}
	}

	payload, err := json.Marshal(utils.RegistrySyncParams{
		PgID: pgID,
	})
	if err != nil {
		log.Error().Msgf("cannot marshal payload: %v", err)
		return err
	}

	worker, err := directory.Worker(rCtx)
	if err != nil {
		log.Error().Msgf("cannot extract namespace: %v", err)
		return err
	}

	err = worker.Enqueue(utils.SyncRegistryTask, payload, utils.CritialTaskOpts()...)
	if err != nil {
		log.Error().Msgf("cannot publish message: %v", err)
		return err
	}
	return nil
}
