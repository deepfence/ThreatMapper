package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httputil"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"

	cloudscanner_diagnosis "github.com/deepfence/ThreatMapper/deepfence_server/diagnosis/cloudscanner-diagnosis"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/sirupsen/logrus"
)

func (h *Handler) RegisterCloudNodeAccountCount(w http.ResponseWriter, r *http.Request) {
	//TODO: Is this used?
}

func (h *Handler) RegisterCloudNodeAccountHandler(w http.ResponseWriter, r *http.Request) {
	req, err := h.extractCloudNodeDetails(w, r)
	if err != nil {
		h.complianceError(w, "Extract cloud node details error")
		return
	}

	logrus.Debugf("Register Cloud Node Account Request: %+v", req)

	var logRequestAction ctl.Action
	monitoredAccountIds := req.MonitoredAccountIds
	orgAccountId := req.OrgAccountId
	scanList := map[string]model.CloudComplianceScanDetails{}
	cloudtrailTrails := []model.CloudNodeCloudtrailTrail{}
	nodeId := req.NodeId

	ctx := r.Context()

	doRefresh := "false"

	logrus.Debugf("Monitored account ids count: %d", len(monitoredAccountIds))
	if len(monitoredAccountIds) != 0 {
		logrus.Debugf("More than 1 account to be monitored: %+v", monitoredAccountIds)
		if orgAccountId == "" {
			h.complianceError(w, "Org account id is needed for multi account setup")
			return
		}
		monitoredAccountIds[req.CloudAccount] = nodeId
		orgNodeId := fmt.Sprintf("%s-%s-cloud-org", req.CloudProvider, orgAccountId)
		orgCloudProvider := model.PostureProviderGCPOrg
		if req.CloudProvider == model.PostureProviderAWS {
			orgCloudProvider = model.PostureProviderAWSOrg
		}
		node := map[string]interface{}{
			"node_id":        orgNodeId,
			"cloud_provider": orgCloudProvider,
			"node_name":      orgAccountId,
			"version":        req.Version,
		}
		err = model.UpsertCloudComplianceNode(ctx, node, "")
		if err != nil {
			h.complianceError(w, err.Error())
			return
		}
		monitoredNodeIds := make([]string, 0, len(monitoredAccountIds))
		for monitoredAccountId, monitoredNodeId := range monitoredAccountIds {
			monitoredNodeIds = append(monitoredNodeIds, monitoredNodeId)
			monitoredNode := map[string]interface{}{
				"node_id":         monitoredNodeId,
				"cloud_provider":  req.CloudProvider,
				"node_name":       monitoredAccountId,
				"organization_id": orgNodeId,
				"version":         req.Version,
			}
			err = model.UpsertCloudComplianceNode(ctx, monitoredNode, orgNodeId)
			if err != nil {
				h.complianceError(w, err.Error())
				return
			}
			pendingScansList, err := reporters_scan.GetCloudCompliancePendingScansList(ctx, utils.NEO4J_CLOUD_COMPLIANCE_SCAN, monitoredNodeId)
			if err != nil {
				continue
			}
			for _, scan := range pendingScansList.ScansInfo {
				benchmarks, err := model.GetActiveCloudControls(ctx, scan.BenchmarkTypes, req.CloudProvider)
				if err != nil {
					log.Error().Msgf("Error getting controls for compliance type: %+v", scan.BenchmarkTypes)
				}
				stopRequested := false
				if scan.Status == utils.SCAN_STATUS_CANCELLING {
					stopRequested = true
				}

				scanDetail := model.CloudComplianceScanDetails{
					ScanId:        scan.ScanId,
					ScanTypes:     scan.BenchmarkTypes,
					AccountId:     monitoredAccountId,
					Benchmarks:    benchmarks,
					StopRequested: stopRequested,
				}
				scanList[scan.ScanId] = scanDetail
			}
		}
		logRequestAction, err = cloudscanner_diagnosis.GetQueuedCloudScannerDiagnosticLogs(ctx, append(monitoredNodeIds, nodeId))
		if err != nil {
			log.Error().Msgf("Error getting queued cloudscanner diagnostic logs: %+v", err)
		}
	} else {
		logrus.Debugf("Single account monitoring for node: %s", nodeId)
		node := map[string]interface{}{
			"node_id":        nodeId,
			"cloud_provider": req.CloudProvider,
			"node_name":      req.CloudAccount,
			"version":        req.Version,
		}
		logrus.Debugf("Node for upsert: %+v", node)
		err = model.UpsertCloudComplianceNode(ctx, node, "")
		if err != nil {
			logrus.Infof("Error while upserting node: %+v", err)
			h.complianceError(w, err.Error())
			return
		}
		// get log request for cloudscanner, if any
		logRequestAction, err := cloudscanner_diagnosis.GetQueuedCloudScannerDiagnosticLogs(ctx, []string{nodeId})
		if err != nil {
			log.Error().Msgf("Error getting queued cloudscanner diagnostic logs: %+v", err)
		}
		pendingScansList, err := reporters_scan.GetCloudCompliancePendingScansList(ctx, utils.NEO4J_CLOUD_COMPLIANCE_SCAN, nodeId)
		if err != nil || len(pendingScansList.ScansInfo) == 0 {
			logrus.Debugf("No pending scans found for node id: %s", nodeId)
			err = httpext.JSON(w, http.StatusOK,
				model.CloudNodeAccountRegisterResp{Data: model.CloudNodeAccountRegisterRespData{Scans: scanList,
					CloudtrailTrails: cloudtrailTrails, Refresh: doRefresh, LogAction: logRequestAction}})
			if err != nil {
				log.Error().Msg(err.Error())
			}
			return
		}
		for _, scan := range pendingScansList.ScansInfo {
			benchmarks, err := model.GetActiveCloudControls(ctx, scan.BenchmarkTypes, req.CloudProvider)
			if err != nil {
				log.Error().Msgf("Error getting controls for compliance type: %+v", scan.BenchmarkTypes)
			}

			stopRequested := false
			if scan.Status == utils.SCAN_STATUS_CANCELLING {
				stopRequested = true
			}
			scanDetail := model.CloudComplianceScanDetails{
				ScanId:        scan.ScanId,
				ScanTypes:     scan.BenchmarkTypes,
				AccountId:     req.CloudAccount,
				Benchmarks:    benchmarks,
				StopRequested: stopRequested,
			}
			scanList[scan.ScanId] = scanDetail
		}
		logrus.Debugf("Pending scans for node: %+v", scanList)
	}
	log.Debug().Msgf("Returning response: Scan List %+v cloudtrailTrails %+v Refresh %s", scanList, cloudtrailTrails, doRefresh)

	err = httpext.JSON(w, http.StatusOK,
		model.CloudNodeAccountRegisterResp{Data: model.CloudNodeAccountRegisterRespData{Scans: scanList,
			CloudtrailTrails: cloudtrailTrails, Refresh: doRefresh, LogAction: logRequestAction}})
	if err != nil {
		log.Error().Msg(err.Error())
	}
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
	}

	return req, err
}

func (h *Handler) CachePostureProviders(ctx context.Context) error {
	worker, err := directory.Worker(ctx)
	if err != nil {
		return err
	}
	return worker.Enqueue(utils.CachePostureProviders, []byte{}, utils.CritialTaskOpts()...)
}
