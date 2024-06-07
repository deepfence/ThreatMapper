package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/hibiken/asynq"
)

var (
	cloudAccountNodeType = ctl.ResourceTypeToString(ctl.CloudAccount)
)

func (h *Handler) RegisterCloudNodeAccountHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.CloudNodeAccountRegisterReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%+v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	log.Debug().Msgf("Register Cloud Node Account Request: %+v", req)

	monitoredAccountIDs := req.MonitoredAccountIDs
	orgAccountID := req.OrganizationAccountID
	nodeID := req.NodeID

	ctx := r.Context()
	if req.IsOrganizationDeployment {
		log.Debug().Msgf("Organization deployment: Accounts monitored: %+v", monitoredAccountIDs)
		if req.OrganizationAccountID == "" {
			h.complianceError(w, "organization account id is needed for multi account setup")
			return
		}
		monitoredAccountIDs[req.AccountID] = nodeID
		orgNodeID := fmt.Sprintf("%s-%s-cloud-org", req.CloudProvider, orgAccountID)
		orgAccountNode := map[string]interface{}{
			"node_id":        orgNodeID,
			"cloud_provider": model.PostureProviderOrgMap[req.CloudProvider],
			"node_name":      orgAccountID,
			"version":        req.Version,
			"node_type":      req.CloudProvider,
		}
		err = model.UpsertCloudComplianceNode(ctx, orgAccountNode, "", req.HostNodeID)
		if err != nil {
			h.complianceError(w, err.Error())
			return
		}
		for monitoredAccountID, monitoredNodeID := range monitoredAccountIDs {
			monitoredNode := map[string]interface{}{
				"node_id":         monitoredNodeID,
				"cloud_provider":  req.CloudProvider,
				"node_name":       monitoredAccountID,
				"organization_id": orgNodeID,
				"version":         req.Version,
				"node_type":       req.CloudProvider,
			}
			err = model.UpsertCloudComplianceNode(ctx, monitoredNode, orgNodeID, req.HostNodeID)
			if err != nil {
				log.Error().Msgf("Error while upserting node: %+v", err)
				h.complianceError(w, err.Error())
				return
			}
		}
	} else {
		log.Debug().Msgf("Single account monitoring for node: %s", nodeID)
		node := map[string]interface{}{
			"node_id":        nodeID,
			"cloud_provider": req.CloudProvider,
			"node_name":      req.AccountID,
			"version":        req.Version,
			"node_type":      req.CloudProvider,
		}
		log.Debug().Msgf("Node for upsert: %+v", node)
		err = model.UpsertCloudComplianceNode(ctx, node, "", req.HostNodeID)
		if err != nil {
			log.Error().Msgf("Error while upserting node: %+v", err)
			h.complianceError(w, err.Error())
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) RefreshCloudAccountHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.CloudAccountRefreshReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	nodeIdentifiers := make([]model.NodeIdentifier, len(req.NodeIDs))
	for i, id := range req.NodeIDs {
		nodeIdentifiers[i] = model.NodeIdentifier{NodeID: id, NodeType: cloudAccountNodeType}
	}

	cloudNodeIds, err := reporters_scan.GetCloudAccountIDs(r.Context(), nodeIdentifiers)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}

	resolvedRequest := model.CloudAccountRefreshReq{NodeIDs: make([]string, len(cloudNodeIds))}
	for i, id := range cloudNodeIds {
		resolvedRequest.NodeIDs[i] = id.NodeID
	}

	err = resolvedRequest.SetCloudAccountRefresh(r.Context())
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ListCloudNodeAccountHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.CloudNodeAccountsListReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	if utils.StringToCloudProvider(req.CloudProvider) == -1 {
		if req.CloudProvider != model.PostureProviderKubernetes && req.CloudProvider != model.PostureProviderLinux {
			err = fmt.Errorf("unknown Provider: %s", req.CloudProvider)
			log.Error().Msgf("%v", err)
			h.respondError(&BadDecoding{err}, w)
			return
		}
	}

	infos, err := model.GetCloudComplianceNodesList(r.Context(), req.CloudProvider, req.Window)
	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, infos)
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) ListCloudNodeProvidersHandler(w http.ResponseWriter, r *http.Request) {

	providers, err := model.GetCloudProvidersList(r.Context())
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(err, w)
		return
	}

	err = httpext.JSON(w, http.StatusOK, model.CloudNodeProvidersListResp{Providers: providers})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) complianceError(w http.ResponseWriter, errorString string) {
	h.respondError(errors.New(errorString), w)
}

func (h *Handler) CachePostureProviders(ctx context.Context) error {
	worker, err := directory.Worker(ctx)
	if err != nil {
		return err
	}
	err = worker.EnqueueUnique(utils.CachePostureProviders, []byte{}, utils.CritialTaskOpts()...)
	if err != nil && err != asynq.ErrTaskIDConflict {
		return err
	}
	return nil
}

func (h *Handler) DeleteCloudAccountHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.CloudAccountDeleteReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}

	log.Info().Msgf("delete cloud accounts request: %v", req)

	if len(req.NodeIDs) > 0 {
		worker, err := directory.Worker(r.Context())
		if err != nil {
			log.Error().Msgf("%v", err)
			h.respondError(&InternalServerError{err}, w)
			return
		}

		data, err := json.Marshal(req)
		if err != nil {
			log.Error().Err(err).Msg("failed to marshal cloud account delete request")
			h.respondError(&InternalServerError{err}, w)
			return
		}

		if err := worker.Enqueue(utils.DeleteCloudAccounts, data, utils.CritialTaskOpts()...); err != nil {
			log.Error().Err(err).Msg("failed enqueue task delete cloud accounts")
			h.respondError(&InternalServerError{err}, w)
			return
		}
	}

	h.AuditUserActivity(r, EventComplianceScan, ActionDelete, req, true)

	w.WriteHeader(http.StatusAccepted)
}
