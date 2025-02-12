package handler

import (
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters/notification"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

func (h *Handler) GetScansHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req model.NotificationGetScanRequest

	// parse request body
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("Error decoding request: %v", err)
		h.respondError(err, w)
		return
	}

	// TODO: check if status provided are valid

	// get scans from db
	scans, err := notification.GetScans(ctx, req.ScanTypes, req.Statuses)
	if err != nil {
		log.Error().Msgf("Error getting scans: %v", err)
		h.respondError(err, w)
		return
	}

	// respond with scans
	err = httpext.JSON(w, http.StatusOK, scans)
	if err != nil {
		log.Error().Msgf("Error responding: %v", err)
	}
}

func (h *Handler) MarkScansReadHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req model.NotificationMarkScanReadRequest

	// parse request body
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("Error decoding request: %v", err)
		h.respondError(err, w)
		return
	}

	// mark scans as read
	err = notification.MarkScansRead(ctx, req.ScanType, req.NodeIDs)
	if err != nil {
		log.Error().Msgf("Error marking scans as read: %v", err)
		h.respondError(err, w)
		return
	}

	// respond with success
	err = httpext.JSON(w, http.StatusOK, nil)
	if err != nil {
		log.Error().Msgf("Error responding: %v", err)
	}
}

/* Registry Sync Handlers */

// GetRegistrySyncHandler returns the registries that are syncing
func (h *Handler) GetRegistrySyncHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// get registries that are syncing
	registries, err := notification.GetRegistrySync(ctx)
	if err != nil {
		log.Error().Msgf("Error getting registries that are syncing: %v", err)
		h.respondError(err, w)
		return
	}

	// respond with registries
	err = httpext.JSON(w, http.StatusOK, registries)
	if err != nil {
		log.Error().Msgf("Error responding: %v", err)
	}
}

/* Integration Handlers */

// GetIntegrationFailuresHandler returns the integrations that have failed
func (h *Handler) GetIntegrationFailuresHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// get integrations that have failed
	integrations, err := notification.GetIntegrationFailures(ctx)
	if err != nil {
		log.Error().Msgf("Error getting integrations that have failed: %v", err)
		h.respondError(err, w)
		return
	}

	// respond with integrations
	err = httpext.JSON(w, http.StatusOK, integrations)
	if err != nil {
		log.Error().Msgf("Error responding: %v", err)
	}
}
