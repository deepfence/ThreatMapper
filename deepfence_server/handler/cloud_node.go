package handler

import (
	"encoding/json"
	"fmt"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/sirupsen/logrus"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

//func scanId(req model.ScanTriggerReq) string {
//	return fmt.Sprintf("%s-%d", req.NodeId, time.Now().Unix())
//}

const (
	CloudComplianceRefreshInventory  = "CLOUD_COMPLIANCE_REFRESH_INVENTORY"
	CloudComplianceScanNodesCacheKey = "CLOUD_COMPLIANCE_NODES_LIST"
	// FilterTypeCloudtrailTrail        = "cloudtrail_trail"
	// PendingCloudComplianceScansKey = "PENDING_CLOUD_COMPLIANCE_SCANS_KEY"
)

func (h *Handler) RegisterCloudNodeAccountHandler(w http.ResponseWriter, r *http.Request) {
	req, err := extractCloudNodeDetails(w, r)
	if err != nil {
		return
	}

	logrus.Infof("Request: %+v", req)

	monitoredAccountIds := req.MonitoredAccountIds
	orgAccountId := req.OrgAccountId
	updatedAtTimestamp := time.Now().Unix()
	scanList := make(map[string]model.CloudComplianceScanDetails)
	cloudtrailTrails := make([]model.CloudNodeCloudtrailTrail, 10)
	nodeId := req.NodeId

	ctx := directory.NewGlobalContext()
	redisClient, err := directory.RedisClient(ctx)
	if err != nil {
		return
	}

	doRefresh, err := redisClient.HGet(ctx, CloudComplianceRefreshInventory, nodeId).Result()
	if err != nil {
		return
	}

	if doRefresh == "" {
		doRefresh = "false"
	}
	if doRefresh == "true" {
		err := redisClient.HSet(ctx, CloudComplianceRefreshInventory, nodeId, "false").Err()
		if err != nil {
			return
		}
	}

	if len(monitoredAccountIds) != 0 {
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
		//jsonNode, err := json.Marshal(node)
		//if err != nil {
		//	complianceError(w, err.Error())
		//}
		//redisClient.HSet(ctx, CloudComplianceScanNodesCacheKey, node["node_id"], string(jsonNode))
		//pgClient, err := directory.PostgresClient(ctx)
		//if err != nil {
		//	httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		//	return
		//}
		//var cloudtrailAlertsNotifications []postgresql_db.CloudtrailAlertNotification
		//var accountTrailsMap map[string][]string
		//if req.CloudProvider == "aws" {
		//	cloudtrailAlertsNotifications, err = pgClient.GetCloudtrailAlertNotifications(ctx)
		//	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		//		complianceError(w, err.Error())
		//		return
		//	}
		//}
		for monitoredAccountId, monitoredNodeId := range monitoredAccountIds {
			var monitoredNode map[string]interface{}
			complianceScanNodeDetailsStr, err := redisClient.HGet(ctx, CloudComplianceScanNodesCacheKey, monitoredNodeId).Result()
			if err != nil {
				complianceError(w, err.Error())
			}
			if complianceScanNodeDetailsStr != "" {
				err = json.Unmarshal([]byte(complianceScanNodeDetailsStr), &monitoredNode)
			}
			monitoredNodeUpdatedAt, ok := monitoredNode["updated_at"].(int64)
			if !ok {
				monitoredNodeUpdatedAt = updatedAtTimestamp
			}
			if len(monitoredNode) > 0 && updatedAtTimestamp > monitoredNodeUpdatedAt {
				monitoredNode["updated_at"] = updatedAtTimestamp
			} else if len(monitoredNode) == 0 {
				monitoredNode = map[string]interface{}{
					"node_id":        monitoredNodeId,
					"cloud_provider": req.CloudProvider,
					"node_name":      monitoredAccountId,
				}
			}
			//jsonMonitoredNode, err := json.Marshal(node)
			//if err != nil {
			//	complianceError(w, err.Error())
			//}
			//redisClient.HSet(ctx, CloudComplianceScanNodesCacheKey, monitoredNodeId, string(jsonMonitoredNode))
			err = model.UpsertCloudComplianceNode(ctx, monitoredNode)
			if err != nil {
				complianceError(w, err.Error())
			}
			//c := model.CloudNodeAccount{NodeID: monitoredNodeId}
			//err = c.LoadFromDbByNodeId(ctx, pgClient)
			//if errors.Is(err, sql.ErrNoRows) {
			//	c = model.CloudNodeAccount{
			//		NodeID:        monitoredNodeId,
			//		NodeName:      monitoredAccountId,
			//		CloudProvider: req.CloudProvider,
			//		OrgAccountID:  sql.NullString{String: fmt.Sprintf("aws-%s;<cloud_org>", orgAccountId), Valid: true},
			//	}
			//	_, err := c.Create(ctx, pgClient)
			//	if err != nil {
			//		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
			//		return
			//	}
			//} else if err != nil {
			//	httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
			//	return
			//}
			//if req.CloudProvider == "aws" {
			//	for _, notification := range cloudtrailAlertsNotifications {
			//		var notificationFilters map[string]interface{}
			//		notificationFiltersByte, err := notification.Filters.RawMessage.MarshalJSON()
			//		if err != nil {
			//			httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
			//			return
			//		}
			//		err = json.Unmarshal(notificationFiltersByte, &notificationFilters)
			//		if err != nil {
			//			httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
			//			return
			//		}
			//		trailFilters, exists := notificationFilters[FilterTypeCloudtrailTrail]
			//		if !exists {
			//			continue
			//		}
			//		trail, ok := trailFilters.(string)
			//		if !ok {
			//			trail = ""
			//		}
			//		accountAndTrail := strings.SplitN(trail, "/", 2)
			//		accountId := accountAndTrail[0]
			//		trailName := accountAndTrail[1]
			//		if accountId != monitoredAccountId {
			//			continue
			//		}
			//		trailNodeId := fmt.Sprintf("aws-%s;<cloud_account>", accountId)
			//		accountTrailNames, exists := accountTrailsMap[trailNodeId]
			//		if !exists {
			//			accountTrailNames = make([]string, len(cloudtrailAlertsNotifications))
			//		}
			//		trailNameFound := false
			//		for _, accountTrailName := range accountTrailNames {
			//			if accountTrailName == trailName {
			//				trailNameFound = true
			//			}
			//		}
			//		if !trailNameFound {
			//			trailItem := model.CloudNodeCloudtrailTrail{
			//				AccountId: accountId,
			//				TrailName: trailName,
			//			}
			//			cloudtrailTrails = append(cloudtrailTrails, trailItem)
			//			accountTrailNames = append(accountTrailNames, trailName)
			//		}
			//	}
			//}
			pendingScansList, err := reporters.GetPendingScansList(ctx, utils.CLOUD_COMPLIANCE_SCAN, monitoredNodeId)
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
			//currentPendingScansStr, err := redisClient.HGet(ctx, PendingCloudComplianceScansKey, monitoredNodeId).Result()
			//if err != nil {
			//	continue
			//}
			//if currentPendingScansStr == "" {
			//	continue
			//}
			//var currentPendingScans []model.PendingCloudComplianceScan
			//err = json.Unmarshal([]byte(currentPendingScansStr), &currentPendingScans)
			//if err != nil {
			//	continue
			//}
			//pendingScansAvailable := false
			//for _, scan := range currentPendingScans {
			//	#     filters = {
			//		#         "node_id": monitored_node_id,
			//		#         "scan_id": scan["scan_id"],
			//		#         "scan_status": ["IN_PROGRESS", "ERROR", "COMPLETED"]
			//	#     }
			//
			//}
			//#     filters = {
			//	#         "node_id": monitored_node_id,
			//	#         "scan_id": scan["scan_id"],
			//	#         "scan_status": ["IN_PROGRESS", "ERROR", "COMPLETED"]
			//#     }
			//#     compliance_log = ESConn.search_by_and_clause(CLOUD_COMPLIANCE_LOGS_INDEX, filters, size=1)
			//#     if not compliance_log.get("hits", []):
			//#         pending_scans_available = True
			//#         scan_list[scan["scan_id"]] = scan
			//# if not pending_scans_available:
			//#     redis.hset(PENDING_CLOUD_COMPLIANCE_SCANS_KEY, monitored_node_id, "")

		}
	} else {
		node := map[string]interface{}{
			//"node_id":        fmt.Sprintf("%s-%s-cloud-acc", req.CloudProvider, req.CloudAccount),
			"node_id":        nodeId,
			"cloud_provider": req.CloudProvider,
			"node_name":      orgAccountId,
		}
		err = model.UpsertCloudComplianceNode(ctx, node)
		if err != nil {
			complianceError(w, err.Error())
		}
		pendingScansList, err := reporters.GetPendingScansList(ctx, utils.CLOUD_COMPLIANCE_SCAN, nodeId)
		if err != nil || len(pendingScansList.ScansInfo) == 0 {
			httpext.JSON(w, http.StatusOK,
				model.CloudNodeAccountRegisterResp{Data: model.CloudNodeAccountRegisterRespData{Scans: scanList,
					CloudtrailTrails: cloudtrailTrails, Refresh: doRefresh}})
			return
		}
		for _, scan := range pendingScansList.ScansInfo {
			scanDetail := model.CloudComplianceScanDetails{
				ScanId:    scan.ScanId,
				ScanType:  utils.CLOUD_COMPLIANCE_SCAN,
				AccountId: nodeId,
			}
			scanList[scan.ScanId] = scanDetail
		}
	}
	httpext.JSON(w, http.StatusOK,
		model.CloudNodeAccountRegisterResp{Data: model.CloudNodeAccountRegisterRespData{Scans: scanList,
			CloudtrailTrails: cloudtrailTrails, Refresh: doRefresh}})
	return

	//scanId := scanId(req)

	//binArgs := map[string]string{
	//	"scan_id":   scanId,
	//	"hostname":  req.NodeId,
	//	"node_type": req.ResourceType,
	//	"node_id":   req.ResourceId,
	//}

	//internal_req := ctl.StartSecretScanRequest{
	//	ResourceId:   req.ResourceId,
	//	ResourceType: ctl.StringToResourceType(req.ResourceType),
	//	BinArgs:      binArgs,
	//	Hostname:     req.NodeId,
	//}

	//b, err := json.Marshal(internal_req)
	//if err != nil {
	//	httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false})
	//	return
	//}

	//action := ctl.Action{
	//	ID:             ctl.StartVulnerabilityScan,
	//	RequestPayload: string(b),
	//}
	//
	//startScan(w, r, utils.NEO4J_VULNERABILITY_SCAN, scanId, req.NodeId, action)
}

func (h *Handler) ListCloudNodeAccountHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.CloudNodeAccountsListReq
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}

	if ctl.StringToCloudProvider(req.CloudProvider) == -1 {
		err = fmt.Errorf("unknown CloudProvider: %s", req.CloudProvider)
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false, Data: err.Error()})
	}

	infos, err := model.GetCloudComplianceNodesList(r.Context(), req.CloudProvider, req.Window)
	if err != nil {
		log.Error().Msgf("%v, req=%v", err, req)
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false})
		return
	}

	httpext.JSON(w, http.StatusOK, infos)
}

func complianceError(w http.ResponseWriter, errorString string) {
	err := httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false,
		Data: errorString})
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
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return req, err
	}

	if ctl.StringToCloudProvider(req.CloudProvider) == -1 {
		err = fmt.Errorf("unknown CloudProvider: %s", req.CloudProvider)
		log.Error().Msgf("%v", err)
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false, Data: err.Error()})
	}

	return req, err
}
