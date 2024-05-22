package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httputil"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/hibiken/asynq"

	cloudscanner_diagnosis "github.com/deepfence/ThreatMapper/deepfence_server/diagnosis/cloudscanner-diagnosis"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/sirupsen/logrus"
)

const (
	trueStr  = "true"
	falseStr = "false"
)

var (
	cloudAccountNodeType = ctl.ResourceTypeToString(ctl.CloudAccount)
)

func (h *Handler) RegisterCloudNodeAccountHandler(w http.ResponseWriter, r *http.Request) {
	req, err := h.extractCloudNodeDetails(w, r)
	if err != nil {
		log.Error().Msgf("Errored out extracting cloud node details error")
		h.complianceError(w, "Extract cloud node details error")
		return
	}

	log.Debug().Msgf("Register Cloud Node Account Request: %+v", req)

	var logRequestAction ctl.Action
	monitoredAccountIDs := req.MonitoredAccountIDs
	orgAccountID := req.OrgAccountID
	scanList := map[string]model.CloudComplianceScanDetails{}
	cloudtrailTrails := []model.CloudNodeCloudtrailTrail{}
	nodeID := req.NodeID

	ctx := r.Context()

	doRefresh := falseStr
	refreshReq := model.CloudAccountRefreshReq{NodeIDs: []string{nodeID}}
	toRefreshNodeIDs, err := refreshReq.GetCloudAccountRefresh(ctx)
	if err == nil {
		if len(toRefreshNodeIDs) > 0 && toRefreshNodeIDs[0] == nodeID {
			doRefresh = trueStr
		}
	}

	log.Debug().Msgf("Monitored account ids count: %d", len(monitoredAccountIDs))
	if len(monitoredAccountIDs) != 0 {
		logrus.Debugf("More than 1 account to be monitored: %+v", monitoredAccountIDs)
		if orgAccountID == "" {
			h.complianceError(w, "Org account id is needed for multi account setup")
			return
		}
		monitoredAccountIDs[req.CloudAccount] = nodeID
		orgNodeID := fmt.Sprintf("%s-%s-cloud-org", req.CloudProvider, orgAccountID)
		nodeType := model.PostureProviderGCP
		orgCloudProvider := model.PostureProviderGCPOrg
		if req.CloudProvider == model.PostureProviderAWS {
			orgCloudProvider = model.PostureProviderAWSOrg
			nodeType = model.PostureProviderAWS
		}
		node := map[string]interface{}{
			"node_id":        orgNodeID,
			"cloud_provider": orgCloudProvider,
			"node_name":      orgAccountID,
			"version":        req.Version,
			"node_type":      nodeType,
		}
		err = model.UpsertCloudComplianceNode(ctx, node, "", req.HostNodeId)
		if err != nil {
			h.complianceError(w, err.Error())
			return
		}
		monitoredNodeIds := make([]string, 0, len(monitoredAccountIDs))
		for monitoredAccountID, monitoredNodeID := range monitoredAccountIDs {
			monitoredNodeIds = append(monitoredNodeIds, monitoredNodeID)
			monitoredNode := map[string]interface{}{
				"node_id":         monitoredNodeID,
				"cloud_provider":  req.CloudProvider,
				"node_name":       monitoredAccountID,
				"organization_id": orgNodeID,
				"version":         req.Version,
				"node_type":       nodeType,
			}
			err = model.UpsertCloudComplianceNode(ctx, monitoredNode, orgNodeID, req.HostNodeId)
			if err != nil {
				h.complianceError(w, err.Error())
				return
			}
		}
		logRequestAction, err = cloudscanner_diagnosis.GetQueuedCloudScannerDiagnosticLogs(ctx, append(monitoredNodeIds, nodeID), h.GetHostURL(r))
		if err != nil {
			log.Error().Msgf("Error getting queued cloudscanner diagnostic logs: %+v", err)
		}
	} else {
		log.Debug().Msgf("Single account monitoring for node: %s", nodeID)
		node := map[string]interface{}{
			"node_id":        nodeID,
			"cloud_provider": req.CloudProvider,
			"node_name":      req.CloudAccount,
			"version":        req.Version,
			"node_type":      req.CloudProvider,
		}
		log.Debug().Msgf("Node for upsert: %+v", node)
		err = model.UpsertCloudComplianceNode(ctx, node, "", req.HostNodeId)
		if err != nil {
			log.Error().Msgf("Error while upserting node: %+v", err)
			h.complianceError(w, err.Error())
			return
		}
		// get log request for cloudscanner, if any
		logRequestAction, err = cloudscanner_diagnosis.GetQueuedCloudScannerDiagnosticLogs(ctx, []string{nodeID}, h.GetHostURL(r))
		if err != nil {
			log.Error().Msgf("Error getting queued cloudscanner diagnostic logs: %+v", err)
		}
		log.Debug().Msgf("Pending scans for node: %+v", scanList)
	}
	log.Debug().Msgf("Returning response: Scan List %+v cloudtrailTrails %+v Refresh %s", scanList, cloudtrailTrails, doRefresh)
	err = httpext.JSON(w, http.StatusOK,
		model.CloudNodeAccountRegisterResp{
			Data: model.CloudNodeAccountRegisterRespData{
				CloudtrailTrails: cloudtrailTrails,
				Refresh:          doRefresh,
				LogAction:        logRequestAction,
			},
		})
	if err != nil {
		log.Error().Msg(err.Error())
	}
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

func (h *Handler) extractCloudNodeDetails(w http.ResponseWriter, r *http.Request) (model.CloudNodeAccountRegisterReq, error) {
	defer r.Body.Close()
	var req model.CloudNodeAccountRegisterReq
	requestDump, err := httputil.DumpRequest(r, true)
	if err != nil {
		fmt.Println(err)
	}
	err = httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	if err != nil {
		log.Error().Msgf("Request dump: %s", string(requestDump))
		log.Error().Msgf("%+v", err)
		h.respondError(&BadDecoding{err}, w)
		return req, err
	}

	if utils.StringToCloudProvider(req.CloudProvider) == -1 {
		err = fmt.Errorf("unknown CloudProvider: %s", req.CloudProvider)
		log.Error().Msgf("%v", err)
		h.respondError(&NotFoundError{err}, w)
		return req, err
	}

	return req, nil
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
