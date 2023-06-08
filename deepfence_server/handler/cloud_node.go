package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httputil"

	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/message/router/middleware"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/sirupsen/logrus"
)

func (h *Handler) RegisterCloudNodeAccountCount(w http.ResponseWriter, r *http.Request) {
	return
}

func (h *Handler) RegisterCloudNodeAccountHandler(w http.ResponseWriter, r *http.Request) {
	req, err := extractCloudNodeDetails(w, r)
	if err != nil {
		complianceError(w, "Extract cloud node details error")
		return
	}

	logrus.Debugf("Register Cloud Node Account Request: %+v", req)

	monitoredAccountIds := req.MonitoredAccountIds
	orgAccountId := req.OrgAccountId
	scanList := map[string]model.CloudComplianceScanDetails{}
	cloudtrailTrails := []model.CloudNodeCloudtrailTrail{}
	nodeId := req.NodeId

	ctx := directory.NewContextWithNameSpace(directory.NonSaaSDirKey)

	doRefresh := "false"

	logrus.Debugf("Monitored account ids count: %d", len(monitoredAccountIds))
	if len(monitoredAccountIds) != 0 {
		logrus.Debugf("More than 1 account to be monitored: %+v", monitoredAccountIds)
		if orgAccountId == "" {
			complianceError(w, "Org account id is needed for multi account setup")
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
		}
		err = model.UpsertCloudComplianceNode(ctx, node, "")
		if err != nil {
			complianceError(w, err.Error())
			return
		}
		for monitoredAccountId, monitoredNodeId := range monitoredAccountIds {
			monitoredNode := map[string]interface{}{
				"node_id":         monitoredNodeId,
				"cloud_provider":  req.CloudProvider,
				"node_name":       monitoredAccountId,
				"organization_id": orgNodeId,
			}
			err = model.UpsertCloudComplianceNode(ctx, monitoredNode, orgNodeId)
			if err != nil {
				complianceError(w, err.Error())
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
				scanDetail := model.CloudComplianceScanDetails{
					ScanId:     scan.ScanId,
					ScanTypes:  scan.BenchmarkTypes,
					AccountId:  monitoredAccountId,
					Benchmarks: benchmarks,
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
		err = model.UpsertCloudComplianceNode(ctx, node, "")
		if err != nil {
			logrus.Infof("Error while upserting node: %+v", err)
			complianceError(w, err.Error())
		}
		pendingScansList, err := reporters_scan.GetCloudCompliancePendingScansList(ctx, utils.NEO4J_CLOUD_COMPLIANCE_SCAN, nodeId)
		if err != nil || len(pendingScansList.ScansInfo) == 0 {
			logrus.Debugf("No pending scans found for node id: %s", nodeId)
			httpext.JSON(w, http.StatusOK,
				model.CloudNodeAccountRegisterResp{Data: model.CloudNodeAccountRegisterRespData{Scans: scanList,
					CloudtrailTrails: cloudtrailTrails, Refresh: doRefresh}})
			return
		}
		for _, scan := range pendingScansList.ScansInfo {
			benchmarks, err := model.GetActiveCloudControls(ctx, scan.BenchmarkTypes, req.CloudProvider)
			if err != nil {
				log.Error().Msgf("Error getting controls for compliance type: %+v", scan.BenchmarkTypes)
			}
			scanDetail := model.CloudComplianceScanDetails{
				ScanId:     scan.ScanId,
				ScanTypes:  scan.BenchmarkTypes,
				AccountId:  req.CloudAccount,
				Benchmarks: benchmarks,
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
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(&BadDecoding{err}, w)
		return
	}

	if utils.StringToCloudProvider(req.CloudProvider) == -1 {
		if req.CloudProvider != model.PostureProviderKubernetes && req.CloudProvider != model.PostureProviderLinux {
			err = fmt.Errorf("unknown Provider: %s", req.CloudProvider)
			log.Error().Msgf("%v", err)
			respondError(&BadDecoding{err}, w)
			return
		}
	}

	infos, err := model.GetCloudComplianceNodesList(r.Context(), req.CloudProvider, req.Window)
	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, infos)
}

func (h *Handler) ListCloudNodeProvidersHandler(w http.ResponseWriter, r *http.Request) {

	providers, err := model.GetCloudProvidersList(r.Context())
	if err != nil {
		log.Error().Msgf("%v", err)
		respondError(err, w)
		return
	}

	httpext.JSON(w, http.StatusOK, model.CloudNodeProvidersListResp{Providers: providers})
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
	requestDump, err := httputil.DumpRequest(r, true)
	if err != nil {
		fmt.Println(err)
	}
	err = httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)

	if err != nil {
		log.Error().Msgf("Request dump: %s", string(requestDump))
		log.Error().Msgf("%+v", err)
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

func (h *Handler) CachePostureProviders(ctx context.Context) error {
	msg := message.NewMessage(watermill.NewUUID(), []byte{})
	namespace, err := directory.ExtractNamespace(ctx)
	if err != nil {
		log.Error().Msgf("cannot extract namespace:", err)
		return err
	}
	msg.Metadata = map[string]string{directory.NamespaceKey: string(namespace)}
	msg.SetContext(directory.NewContextWithNameSpace(namespace))
	middleware.SetCorrelationID(watermill.NewShortUUID(), msg)

	err = h.TasksPublisher.Publish(utils.CachePostureProviders, msg)
	if err != nil {
		log.Error().Msgf("cannot publish message:", err)
		return err
	}
	return nil
}
