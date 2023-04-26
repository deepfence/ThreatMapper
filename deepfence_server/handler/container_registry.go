package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	api_messages "github.com/deepfence/ThreatMapper/deepfence_server/constants/api-messages"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry/gcr"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/encryption"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/go-chi/chi/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/samber/mo"
)

func (h *Handler) ListRegistry(w http.ResponseWriter, r *http.Request) {
	var req model.RegistryListReq

	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&InternalServerError{err}, w)
		return
	}
	registries, err := req.ListRegistriesSafe(ctx, pgClient)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&InternalServerError{err}, w)
		return
	}

	registriesResponse := make([]model.RegistryListResp, 0)
	for _, r := range registries {
		reg, err := registry.GetRegistryWithRegistrySafeRow(r)
		if err != nil {
			log.Error().Err(err).Msgf("Fail to unmarshal registry from DB")
			continue
		}
		registryId := model.GetRegistryID(reg.GetRegistryType(), reg.GetNamespace())
		registryResponse := model.RegistryListResp{
			ID:           r.ID,
			NodeID:       registryId,
			Name:         r.Name,
			RegistryType: r.RegistryType,
			NonSecret:    r.NonSecret,
			CreatedAt:    r.CreatedAt.Unix(),
			UpdatedAt:    r.UpdatedAt.Unix(),
		}
		registriesResponse = append(registriesResponse, registryResponse)
	}

	httpext.JSON(w, http.StatusOK, registriesResponse)

}

func (h *Handler) AddRegistry(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.RegistryAddReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	// identify registry and interface it
	b, err := json.Marshal(req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	registry, err := registry.GetRegistry(req.RegistryType, b)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	// validate if registry credential is correct
	if !registry.IsValidCredential() {
		httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryAuthFailed})
		return
	}

	// add registry to database
	// before that check if registry already exists
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(&InternalServerError{err}, w)
		return
	}
	registryExists, err := req.RegistryExists(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}
	if registryExists {
		httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryExists})
		return
	}

	// encrypt secret
	aesValue, err := model.GetAESValueForEncryption(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}

	// note: we'll encrypt the secret in registry interface object and use its secretgetter
	// to map the secrets with req
	aes := encryption.AES{}
	err = json.Unmarshal(aesValue, &aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}
	err = registry.EncryptSecret(aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{errors.New("something went wrong")}, w)
		return
	}
	req.Secret = registry.GetSecret()
	req.Extras = registry.GetExtras()

	// add to registry db
	err = req.CreateRegistry(ctx, pgClient, registry.GetNamespace())
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}
	httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessRegistryCreated})
}

// update registry
func (h *Handler) UpdateRegistry(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.RegistryUpdateReq
	err := httpext.DecodeJSON(r, httpext.QueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	idStr := chi.URLParam(r, "registry_id")
	if idStr == "" {
		httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryIdMissing})
		return
	}

	updateSecret := req.Secret != nil

	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	// before that check if registry exists
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(&InternalServerError{err}, w)
		return
	}
	registryExists, err := req.RegistryExists(ctx, pgClient, int32(id))
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}
	if !registryExists {
		httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryNotExists})
		return
	}

	// identify registry and interface it
	b, err := json.Marshal(req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	registry, err := registry.GetRegistry(req.RegistryType, b)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	// todo: get aes key, has to be a better way to avoid getting this everytime
	aesValue, err := model.GetAESValueForEncryption(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}
	aes := encryption.AES{}
	err = json.Unmarshal(aesValue, &aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}
	if !updateSecret {
		// decrypt secret
		err = registry.DecryptSecret(aes)
		if err != nil {
			log.Error().Msgf(err.Error())
			respondError(&InternalServerError{errors.New("something went wrong")}, w)
			return
		}
	}

	// validate if registry credential is correct
	if !registry.IsValidCredential() {
		httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryAuthFailed})
		return
	}

	// note: we'll encrypt the secret in registry interface object and use its secretgetter
	// to map the secrets with req
	err = registry.EncryptSecret(aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{errors.New("something went wrong")}, w)
		return
	}
	req.Secret = registry.GetSecret()
	req.Extras = registry.GetExtras()

	// update registry db
	err = req.UpdateRegistry(ctx, pgClient, int32(id))
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}
	httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessRegistryUpdated})
}

func (h *Handler) AddGoogleContainerRegistry(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()

	if err := r.ParseMultipartForm(1024 * 1024); err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	file, fileHeader, err := r.FormFile("service_account_json")
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	defer file.Close()

	if (fileHeader.Header.Get("Content-Type")) != "application/json" {
		httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: "uploaded file is not json"})
		return
	}

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}

	registryName := r.FormValue("name")
	if registryName == "" {
		httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: "registry name cannot be empty"})
		return
	}

	registryURL := r.FormValue("registry_url")
	if registryName == "" {
		httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: "registry url cannot be empty"})
		return
	}

	var sa gcr.ServiceAccountJson
	if err := json.Unmarshal(fileBytes, &sa); err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}

	req := model.RegistryAddReq{
		Name:         registryName,
		NonSecret:    map[string]interface{}{"registry_url": registryURL, "project_id": sa.ProjectID},
		Secret:       map[string]interface{}{"project_id_secret": sa.ProjectID, "private_key_id": sa.PrivateKeyID},
		Extras:       map[string]interface{}{"service_account_json": string(fileBytes)},
		RegistryType: constants.GCR,
	}

	// identify registry and interface it
	b, err := json.Marshal(req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	registry, err := registry.GetRegistry(constants.GCR, b)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	// validate if registry credential is correct
	if !registry.IsValidCredential() {
		httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryAuthFailed})
		return
	}

	// add registry to database
	// before that check if registry already exists
	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(&InternalServerError{err}, w)
		return
	}
	registryExists, err := req.RegistryExists(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}
	if registryExists {
		httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryExists})
		return
	}

	// encrypt secret
	aesValue, err := model.GetAESValueForEncryption(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}

	// note: we'll encrypt the secret in registry interface object and use its secret getter
	// to map the secrets with req
	aes := encryption.AES{}
	err = json.Unmarshal(aesValue, &aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}

	err = registry.EncryptSecret(aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{errors.New("something went wrong")}, w)
		return
	}

	err = registry.EncryptExtras(aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{errors.New("something went wrong")}, w)
		return
	}

	req.Secret = registry.GetSecret()
	req.Extras = registry.GetExtras()

	// add to registry db
	err = req.CreateRegistry(ctx, pgClient, registry.GetNamespace())
	if err != nil {
		log.Error().Msgf(err.Error())
		respondError(&InternalServerError{err}, w)
		return
	}
	httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessRegistryCreated})
}

func (h *Handler) DeleteRegistry(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "registry_id")

	pgIds, err := model.GetRegistryPgIds(r.Context(), id)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&NotFoundError{err}, w)
		return
	}

	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&InternalServerError{err}, w)
		return
	}
	log.Info().Msgf("IDs: %v", pgIds)
	for _, id := range pgIds {
		err = model.DeleteRegistry(ctx, pgClient, int32(id))
		if err != nil {
			log.Error().Msgf("%v", err)
			respondError(&InternalServerError{err}, w)
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)

}

func (h *Handler) getImages(w http.ResponseWriter, r *http.Request) ([]model.ContainerImage, error) {
	images := []model.ContainerImage{}
	var req model.RegistryImagesReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return images, err
	}
	err = h.Validator.Struct(req)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return images, err
	}

	images, err = model.ListImages(r.Context(), req.RegistryId, req.ImageFilter, req.Window)
	if err != nil {
		log.Error().Msgf("failed list images: %v", err)
		respondError(err, w)
		return images, err
	}

	log.Info().Msgf("get images for registry id %d found %d images", req.RegistryId, len(images))

	return images, nil
}

func (h *Handler) ListImages(w http.ResponseWriter, r *http.Request) {
	images, err := h.getImages(w, r)

	if err == nil {
		httpext.JSON(w, http.StatusOK, images)
	}
}

func (h *Handler) CountImages(w http.ResponseWriter, r *http.Request) {
	images, err := h.getImages(w, r)

	if err == nil {
		httpext.JSON(w, http.StatusOK, model.RegistryCountResp{
			Count: len(images),
		})
	}
}

func (h *Handler) getImageStubs(w http.ResponseWriter, r *http.Request) ([]model.ImageStub, error) {
	images := []model.ImageStub{}
	var req model.RegistryImageStubsReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return images, err
	}
	err = h.Validator.Struct(req)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return images, err
	}

	images, err = model.ListImageStubs(r.Context(), req.RegistryId, req.ImageFilter, req.Window)
	if err != nil {
		log.Error().Msgf("failed get stubs %v", err)
		respondError(err, w)
		return images, err
	}

	return images, nil
}

func (h *Handler) ListImageStubs(w http.ResponseWriter, r *http.Request) {
	images, err := h.getImageStubs(w, r)
	if err == nil {
		httpext.JSON(w, http.StatusOK, images)
	}
}

func (h *Handler) CountImageStubs(w http.ResponseWriter, r *http.Request) {
	images, err := h.getImageStubs(w, r)
	if err == nil {
		httpext.JSON(w, http.StatusOK, model.RegistryCountResp{
			Count: len(images),
		})
	}
}

func getIntPointer(val int32) *int32 {
	return &val
}

func (h *Handler) RegistrySummary(w http.ResponseWriter, r *http.Request) {

	counts := model.Summary{}

	req := model.RegistryIDPathReq{
		RegistryId: chi.URLParam(r, "registry_id"),
	}
	err := h.Validator.Struct(req)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return
	}

	// count registry resource
	counts, err = model.RegistrySummary(r.Context(), mo.Some(req.RegistryId), mo.None[string]())
	if err != nil {
		log.Error().Msgf("failed registry summary: %v", err)
		respondError(err, w)
		return
	}

	log.Info().Msgf("registry %s summary %+v", req.RegistryId, counts)

	httpext.JSON(w, http.StatusOK, counts)
}

func (h *Handler) SummaryByRegistryType(w http.ResponseWriter, r *http.Request) {

	counts := model.Summary{}

	req := model.RegistryTypeReq{
		RegistryType: chi.URLParam(r, "registry_type"),
	}
	err := h.Validator.Struct(req)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return
	}

	// count registry resource
	counts, err = model.RegistrySummary(r.Context(), mo.None[string](), mo.Some(req.RegistryType))
	if err != nil {
		log.Error().Msgf("failed registry summary: %v", err)
		respondError(err, w)
		return
	}

	log.Info().Msgf("registries %s summary %+v", req.RegistryType, counts)

	httpext.JSON(w, http.StatusOK, counts)
}

func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {

	counts := model.RegistrySummaryAllResp{}

	// count registry resource
	counts, err := model.RegistrySummaryAll(r.Context())
	if err != nil {
		log.Error().Msgf("failed registry summary all: %v", err)
		respondError(err, w)
		return
	}

	log.Info().Msgf("all registries summary %+v", counts)

	httpext.JSON(w, http.StatusOK, counts)
}
