package handler

import (
	"encoding/json"
	"net/http"

	api_messages "github.com/deepfence/ThreatMapper/deepfence_server/constants/api-messages"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/encryption"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) ListRegistry(w http.ResponseWriter, r *http.Request) {
	var req model.RegistryListReq

	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusInternalServerError, model.ErrorResponse{Message: err.Error()})
		return
	}
	registries, err := req.ListRegistriesSafe(ctx, pgClient)
	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusInternalServerError, model.ErrorResponse{Message: err.Error()})
		return
	}

	httpext.JSON(w, http.StatusOK, registries)

}

func (h *Handler) AddRegistry(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.RegistryAddReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadGateway, model.ErrorResponse{Message: err.Error()})
		return
	}

	// identify registry and interface it
	b, err := json.Marshal(req)
	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadGateway, model.ErrorResponse{Message: err.Error()})
		return
	}

	registry, err := registry.GetRegistry(req.RegistryType, b)
	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadGateway, model.ErrorResponse{Message: err.Error()})
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
		httpext.JSON(w, http.StatusInternalServerError, model.ErrorResponse{Message: err.Error()})
		return
	}
	registryExists, err := req.RegistryExists(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.ErrorResponse{Message: err.Error()})
		return
	}
	if registryExists {
		httpext.JSON(w, http.StatusBadRequest, model.ErrorResponse{Message: api_messages.ErrRegistryExists})
		return
	}

	// encrypt secret
	aesValue, err := req.GetAESValueForEncryption(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.ErrorResponse{Message: err.Error()})
		return
	}

	// note: we'll encrypt the secret in registry interface object and use its secretgetter
	// to map the secrets with req
	aes := encryption.AES{}
	err = json.Unmarshal(aesValue, &aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.ErrorResponse{Message: err.Error()})
		return
	}
	err = registry.EncryptSecret(aes)
	if err != nil {
		log.Error().Msgf(err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.ErrorResponse{Message: "something went wrong"})
		return
	}
	req.Secret = registry.GetSecret()

	// add to registry db
	err = req.CreateRegistry(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.ErrorResponse{Message: err.Error()})
		return
	}
	httpext.JSON(w, http.StatusOK, api_messages.SuccessRegistryCreated)
}

func (h *Handler) ListImagesInRegistry(w http.ResponseWriter, r *http.Request) {
	queryParam := r.URL.Query()
	rType := queryParam.Get("registry_type")
	ns := queryParam.Get("namespace")
	req := model.RegistryImageListReq{
		ResourceType: rType,
		Namespace:    ns,
	}

	i, err := req.GetRegistryImages(r.Context())
	if err != nil {
		log.Error().Msgf(err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.ErrorResponse{Message: err.Error()})
		return
	}

	httpext.JSON(w, http.StatusOK, i)
}
