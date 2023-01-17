package handler

import (
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/registry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) ListRegistry(w http.ResponseWriter, r *http.Request) {

}

func (h *Handler) AddRegistry(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.RegistryAddReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}

	// identify registry and interface it
	// var registry registry.Registry
	registry := registry.GetRegistry(req.Name)

	// validate if registry credential is correct
	if !registry.IsValidCredential() {
		log.Error().Msgf("")
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false, Message: "Authentication failed for given credentials"})
	}

	// add registry to database
	// TODO
}

func (h *Handler) ListImagesInRegistry(w http.ResponseWriter, r *http.Request) {

}
