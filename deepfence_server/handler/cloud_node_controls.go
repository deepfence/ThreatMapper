package handler

import (
	"encoding/json"
	"io"
	"net/http"

	httpext "github.com/go-playground/pkg/v5/net/http"

	api_messages "github.com/deepfence/ThreatMapper/deepfence_server/constants/api-messages"
	"github.com/deepfence/ThreatMapper/deepfence_server/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

func (h *Handler) GetCloudNodeControls(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	data, err := io.ReadAll(r.Body)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	var cloudNodeControl model.CloudNodeControlReq

	err = json.Unmarshal(data, &cloudNodeControl)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	controls, err := controls.GetCloudNodeComplianceControls(ctx, cloudNodeControl.NodeID, cloudNodeControl.CloudProvider, cloudNodeControl.ComplianceType)
	if err != nil {
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	err = httpext.JSON(w, http.StatusOK, model.CloudNodeControlResp{
		Controls: controls,
	})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) EnableCloudNodeControls(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	data, err := io.ReadAll(r.Body)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	var cloudNodeControl model.CloudNodeEnableDisableReq

	err = json.Unmarshal(data, &cloudNodeControl)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	err = controls.EnableCloudNodeComplianceControls(ctx, cloudNodeControl.NodeID, cloudNodeControl.ControlsIDs)
	if err != nil {
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	err = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessCloudControlsEnabled})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) DisableCloudNodeControls(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	data, err := io.ReadAll(r.Body)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	var cloudNodeControl model.CloudNodeEnableDisableReq

	err = json.Unmarshal(data, &cloudNodeControl)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	err = controls.DisableCloudNodeComplianceControls(ctx, cloudNodeControl.NodeID, cloudNodeControl.ControlsIDs)
	if err != nil {
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	err = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: api_messages.SuccessCloudControlsDisabled})

	if err != nil {
		log.Error().Msg(err.Error())
	}
}
