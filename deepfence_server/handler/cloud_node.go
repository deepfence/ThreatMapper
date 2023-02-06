package handler

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/sirupsen/logrus"
)

func (h *Handler) RegisterCloudNodeAccountHandler(w http.ResponseWriter, r *http.Request) {
	req, err := extractCloudNodeDetails(w, r)
	if err != nil {
		return
	}

	logrus.Debugf("Register Cloud Node Account Request: %+v", req)

	monitoredAccountIds := req.MonitoredAccountIds
	orgAccountId := req.OrgAccountId
	scanList := make(map[string]model.CloudComplianceScanDetails)
	cloudtrailTrails := make([]model.CloudNodeCloudtrailTrail, 10)
	nodeId := req.NodeId

	ctx := directory.NewContextWithNameSpace(directory.NonSaaSDirKey)

	doRefresh := "false"

	logrus.Debugf("Monitored account ids count: %d", len(monitoredAccountIds))
	if len(monitoredAccountIds) != 0 {
		logrus.Debugf("More than 1 account to be monitored: %+v", monitoredAccountIds)
		if orgAccountId != "" {
			complianceError(w, "Org account id is needed for multi account setup")
			return
		}
		monitoredAccountIds[req.CloudAccount] = nodeId
		node := map[string]interface{}{
			"node_id":        fmt.Sprintf("%s-%s-cloud-org", req.CloudProvider, orgAccountId),
			"cloud_provider": req.CloudProvider,
			"node_name":      orgAccountId,
		}
		err = model.UpsertCloudComplianceNode(ctx, node)
		if err != nil {
			complianceError(w, err.Error())
		}
		for monitoredAccountId, monitoredNodeId := range monitoredAccountIds {
			var monitoredNode map[string]interface{}
			monitoredNode = map[string]interface{}{
				"node_id":        monitoredNodeId,
				"cloud_provider": req.CloudProvider,
				"node_name":      monitoredAccountId,
			}
			err = model.UpsertCloudComplianceNode(ctx, monitoredNode)
			if err != nil {
				complianceError(w, err.Error())
			}
			pendingScansList, err := reporters.GetPendingScansList(ctx, utils.NEO4J_CLOUD_COMPLIANCE_SCAN, monitoredNodeId)
			if err != nil {
				continue
			}
			for _, scan := range pendingScansList.ScansInfo {
				scanDetail := model.CloudComplianceScanDetails{
					ScanId:    scan.ScanId,
					ScanType:  "cis",
					AccountId: monitoredNodeId,
				}
				scanList[scan.ScanId] = scanDetail
			}
		}
	} else {
		logrus.Debugf("Single account monitoring for node: %s", nodeId)
		node := map[string]interface{}{
			"node_id":        nodeId,
			"cloud_provider": req.CloudProvider,
			"node_name":      req.CloudAccount,
		}
		logrus.Debugf("Node for upsert: %+v", node)
		err = model.UpsertCloudComplianceNode(ctx, node)
		if err != nil {
			logrus.Infof("Error while upserting node: %+v", err)
			complianceError(w, err.Error())
		}
		pendingScansList, err := reporters.GetPendingScansList(ctx, utils.NEO4J_CLOUD_COMPLIANCE_SCAN, nodeId)
		if err != nil || len(pendingScansList.ScansInfo) == 0 {
			logrus.Debugf("No pending scans found for node id: %s", nodeId)
			httpext.JSON(w, http.StatusOK,
				model.CloudNodeAccountRegisterResp{Data: model.CloudNodeAccountRegisterRespData{Scans: scanList,
					CloudtrailTrails: cloudtrailTrails, Refresh: doRefresh}})
			return
		}
		for _, scan := range pendingScansList.ScansInfo {
			scanDetail := model.CloudComplianceScanDetails{
				ScanId:    scan.ScanId,
				ScanType:  "cis",
				AccountId: req.CloudAccount,
				Controls:  []string{"control.cis_v140_1_1", "control.cis_v140_1_2", "control.cis_v140_1_4"},
			}
			scanList[scan.ScanId] = scanDetail
		}
		logrus.Debugf("Pending scans for node: %+v", scanList)
	}
	logrus.Debugf("Returning response: Scan List %+v cloudtrailTrails %+v Refresh %s", scanList, cloudtrailTrails, doRefresh)
	httpext.JSON(w, http.StatusOK,
		model.CloudNodeAccountRegisterResp{Data: model.CloudNodeAccountRegisterRespData{Scans: scanList,
			CloudtrailTrails: cloudtrailTrails, Refresh: doRefresh}})
	return
}

func (h *Handler) ListCloudNodeAccountHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.CloudNodeAccountsListReq
	err := httpext.DecodeQueryParams(r, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	if utils.StringToCloudProvider(req.CloudProvider) == -1 {
		err = fmt.Errorf("unknown CloudProvider: %s", req.CloudProvider)
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	infos, err := model.GetCloudComplianceNodesList(r.Context(), req.CloudProvider, req.Offset, req.Size)
	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, infos)
}

func complianceError(w http.ResponseWriter, errorString string) {
	err := respondError(errors.New(errorString), w)
	if err != nil {
		log.Error().Msgf("%v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(errorString))
	}
}

func extractCloudNodeDetails(w http.ResponseWriter, r *http.Request) (model.CloudNodeAccountRegisterReq, error) {
	defer r.Body.Close()
	var req model.CloudNodeAccountRegisterReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return req, err
	}

	if utils.StringToCloudProvider(req.CloudProvider) == -1 {
		err = fmt.Errorf("unknown CloudProvider: %s", req.CloudProvider)
		log.Error().Msgf("%v", err)
		respondError(&NotFoundError{err}, w)
	}

	return req, err
}
