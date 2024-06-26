package cronjobs

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/integrations"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
)

const NOTIFICATION_INTERVAL = 60000 //in milliseconds

var ErrUnsupportedScan = errors.New("unsupported scan type in integration")

var fieldsMap = map[string]map[string]string{
	utils.ScanTypeDetectedNode[utils.NEO4JVulnerabilityScan]: {
		"cve_severity":          "Severity",
		"cve_id":                "CVE Id",
		"cve_description":       "Description",
		"cve_attack_vector":     "Attack Vector",
		"cve_container_layer":   "Container Layer",
		"cve_overall_score":     "CVE Overall Score",
		"cve_type":              "CVE Type",
		"cve_link":              "CVE Link",
		"cve_fixed_in":          "CVE Fixed In",
		"cve_cvss_score":        "CVSS Score",
		"cve_caused_by_package": "CVE Caused By Package",
		"node_id":               "Node ID",
		"updated_at":            "updated_at"},
	utils.ScanTypeDetectedNode[utils.NEO4JSecretScan]: {
		"node_id":            "Node ID",
		"full_filename":      "File Name",
		"matched_content":    "Matched Content",
		"level":              "Level",
		"score":              "Score",
		"rule_id":            "Rule",
		"name":               "Name",
		"part":               "Part",
		"signature_to_match": "Matched Signature",
		"updated_at":         "updated_at"},
	utils.ScanTypeDetectedNode[utils.NEO4JMalwareScan]: {
		"class":             "Class",
		"complete_filename": "File Name",
		"file_sev_score":    "File Severity Score",
		"file_severity":     "File Severity",
		"image_layer_id":    "Image Layer ID",
		"node_id":           "Node ID",
		"rule_id":           "Rule ID",
		"rule_name":         "Rule Name",
		"author":            "Author",
		"severity_score":    "Severity Score",
		"summary":           "Summary",
		"updated_at":        "updated_at"},
	utils.ScanTypeDetectedNode[utils.NEO4JComplianceScan]: {
		"compliance_check_type": "Compliance Check Type",
		"resource":              "Resource",
		"status":                "Test Status",
		"test_category":         "Test Category",
		"description":           "Description",
		"test_number":           "Test ID",
		"test_desc":             "Info"},
	utils.ScanTypeDetectedNode[utils.NEO4JCloudComplianceScan]: {
		"title":                 "Title",
		"reason":                "Reason",
		"resource":              "Resource",
		"status":                "Test Status",
		"region":                "Region",
		"account_id":            "Account ID",
		"service":               "Service",
		"compliance_check_type": "Compliance Check Type",
		"cloud_provider":        "Cloud Provider",
		"node_id":               "Node ID",
		"type":                  "Type",
		"control_id":            "Control ID",
		"description":           "Description",
		"severity":              "Severity",
		"resources":             "Resources",
	},
}

const DefaultNotificationErrorBackoff = 15 * time.Minute

var (
	NotificationErrorBackoff time.Duration
	// notificationLock         sync.Mutex
)

func init() {
	backoffTimeStr := os.Getenv("DEEPFENCE_NOTIFICATION_ERROR_BACKOFF_MINUTES")
	status := false
	if len(backoffTimeStr) > 0 {
		value, err := strconv.Atoi(backoffTimeStr)
		if err == nil && value > 0 {
			NotificationErrorBackoff = time.Duration(value) * time.Minute
			status = true
			log.Info().Msgf("Setting notification err backoff to: %v",
				NotificationErrorBackoff)
		}
	}

	if !status {
		log.Info().Msgf("Setting notification err backoff to default: %v",
			DefaultNotificationErrorBackoff)
		NotificationErrorBackoff = DefaultNotificationErrorBackoff
	}
}

type SendNotificationsTaskParams struct {
	PgID int32 `json:"pg_id"`
}

func TriggerSendNotifications(ctx context.Context, task *asynq.Task) error {
	log := log.WithCtx(ctx)

	log.Debug().Msg("Execute TriggerSendNotifications")
	defer log.Debug().Msg("Execute TriggerSendNotifications - Done")

	worker, err := directory.Worker(ctx)
	if err != nil {
		log.Error().Msgf("Error getting workerCrx: %v", err)
		return nil
	}

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("Error getting postgresCtx: %v", err)
		return nil
	}
	integrations, err := pgClient.GetIntegrations(ctx)
	if err != nil {
		log.Error().Msgf("Error getting integrations: %v", err)
		return nil
	}

	// check if any integrations are configured
	if len(integrations) <= 0 {
		log.Warn().Msg("No integrations configured to notify")
		return nil
	}

	for _, ig := range integrations {
		// check if integration can be triggered
		if ig.ErrorMsg.String != "" &&
			time.Since(ig.LastSentTime.Time) < NotificationErrorBackoff {
			log.Info().Msgf("Skipping integration for %s rowId: %d due to error: %s "+
				"occured at last attempt, %s ago",
				ig.IntegrationType, ig.ID,
				ig.ErrorMsg.String, time.Since(ig.LastSentTime.Time))
			continue
		}

		params := SendNotificationsTaskParams{PgID: ig.ID}

		data, err := json.Marshal(params)
		if err != nil {
			log.Error().Err(err).Msg("failsed to marshal payload")
		}

		uniqueTaskID := fmt.Sprintf("%d-%s-%d", ig.ID, ig.IntegrationType, ig.LastSentTime.Time.UnixMilli())

		if err := worker.EnqueueUniqueWithTaskID(utils.SendNotificationTask, uniqueTaskID,
			data, utils.LowTaskOpts()...); err != nil {
			log.Error().Err(err).Msgf("failed to enque SendNotificationTask for %d %s",
				ig.ID, ig.IntegrationType)
		}
	}

	return nil
}

func SendNotifications(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	start := time.Now()

	var params SendNotificationsTaskParams
	if err := json.Unmarshal(task.Payload(), &params); err != nil {
		log.Error().Err(err).Msg("failed to unmarshal task payload")
		return nil
	}

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("Error getting postgresCtx: %v", err)
		return nil
	}
	intg, err := pgClient.GetIntegrationFromID(ctx, params.PgID)
	if err != nil {
		log.Error().Msgf("Error getting postgresCtx: %v", err)
		return nil
	}

	log.Info().Msgf("SendNotification id: %d type: %s", intg.ID, intg.IntegrationType)
	defer func() {
		log.Info().Msgf("SendNotification id: %d type: %s elapsed: %s", intg.ID, intg.IntegrationType, time.Since(start))
	}()

	err = processForResource(ctx, intg)

	update_row := err != nil || (intg.ErrorMsg.Valid && err == nil)
	if update_row {
		var params postgresql_db.UpdateIntegrationStatusParams
		if err != nil {
			log.Error().Msgf("Error on integration %v", err)
			params = postgresql_db.UpdateIntegrationStatusParams{
				ID: intg.ID,
				ErrorMsg: sql.NullString{
					String: err.Error(),
					Valid:  true,
				},
			}
		} else {
			params = postgresql_db.UpdateIntegrationStatusParams{
				ID: intg.ID,
				ErrorMsg: sql.NullString{
					String: "",
					Valid:  false,
				},
			}
		}
		err = pgClient.UpdateIntegrationStatus(ctx, params)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}

	return nil
}

func processForResource(ctx context.Context, integration postgresql_db.Integration) error {
	switch integration.Resource {
	case utils.ScanTypeDetectedNode[utils.NEO4JVulnerabilityScan]:
		return processIntegration[model.Vulnerability](ctx, integration)
	case utils.ScanTypeDetectedNode[utils.NEO4JSecretScan]:
		return processIntegration[model.Secret](ctx, integration)
	case utils.ScanTypeDetectedNode[utils.NEO4JMalwareScan]:
		return processIntegration[model.Malware](ctx, integration)
	case utils.ScanTypeDetectedNode[utils.NEO4JComplianceScan]:
		return processIntegration[model.Compliance](ctx, integration)
	case utils.ScanTypeDetectedNode[utils.NEO4JCloudComplianceScan]:
		return processIntegration[model.CloudCompliance](ctx, integration)
	default:
		return errors.New("unknown resource type in integration")
	}
}

func processIntegration[T any](ctx context.Context, intg postgresql_db.Integration) error {

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "cronjobs", "process-integration")
	defer span.End()

	var filters model.IntegrationFilters
	err := json.Unmarshal(intg.Filters, &filters)
	if err != nil {
		return err
	}

	start := time.Now()

	// check if last_event_updated_at time is available
	// or default to time.Now() - NOTIFICATION_INTERVAL
	updatedAt := func(eTime sql.NullTime) string {
		if intg.LastEventUpdatedAt.Valid {
			return strconv.FormatInt(eTime.Time.UnixMilli(), 10)
		}
		return strconv.FormatInt(start.UnixMilli()-NOTIFICATION_INTERVAL, 10)
	}

	filters.FieldsFilters = reporters.FieldsFilters{}
	filters.FieldsFilters.CompareFilters = append(
		filters.FieldsFilters.CompareFilters,
		reporters.CompareFilter{
			FieldName:   "updated_at",
			GreaterThan: true,
			FieldValue:  updatedAt(intg.LastEventUpdatedAt),
		},
	)
	filters.FieldsFilters.ContainsFilter = reporters.ContainsFilter{
		FieldsValues: map[string][]interface{}{"status": {utils.ScanStatusSuccess}},
	}

	scansList := []model.ScanInfo{}
	scanType, ok := utils.DetectedNodeScanType[intg.Resource]
	if !ok {
		log.Error().Msgf("error %s: %v", ErrUnsupportedScan, intg)
		return ErrUnsupportedScan
	}

	reqNC, reqC := integrationFilters2SearchScanReqs(filters)
	profileStart := time.Now()
	if reqNC != nil {
		scansInfo, err := reporters_search.SearchScansReport(ctx, *reqNC, scanType)
		if err != nil {
			log.Error().Msgf("Failed to get scans for non-container type, error: %v", err)
			return err
		} else if len(scansInfo) > 0 {
			scansList = append(scansList, scansInfo...)
		}
	}
	neo4j_query_nc := time.Since(profileStart)

	profileStart = time.Now()
	if reqC != nil {
		containerScanInfo, err := reporters_search.SearchScansReport(ctx, *reqC, scanType)
		if err != nil {
			log.Error().Msgf("Failed to get scans for container type, error: %v", err)
			return err
		} else if len(containerScanInfo) > 0 {
			scansList = append(scansList, containerScanInfo...)
		}
	}
	neo4j_query_c := time.Since(profileStart)

	neo4j_query_default := time.Duration(0)
	if reqNC == nil && reqC == nil {
		profileStart = time.Now()
		reqDefault := reporters_search.SearchScanReq{}
		reqDefault.ScanFilter = reporters_search.SearchFilter{
			Filters: filters.FieldsFilters,
		}
		reqDefault.Window = model.FetchWindow{}
		defaultScanInfo, err := reporters_search.SearchScansReport(ctx, reqDefault, scanType)
		if err != nil {
			log.Error().Msgf("Failed to get default scans, error: %v", err)
			return err
		} else if len(defaultScanInfo) > 0 {
			scansList = append(scansList, defaultScanInfo...)
		}
		neo4j_query_default = time.Since(profileStart)
	}

	// nothing to notify
	if len(scansList) == 0 {
		log.Info().Msgf("No %s scans after timestamp %d",
			intg.Resource, intg.LastEventUpdatedAt.Time.UnixMilli())
		return nil
	}

	log.Info().Msgf("list of %s scans to notify: %+v", intg.Resource, scansList)

	filters = model.IntegrationFilters{}
	err = json.Unmarshal(intg.Filters, &filters)
	if err != nil {
		return err
	}
	filters.NodeIds = []model.NodeIdentifier{}

	totalQueryTime := time.Duration(0)
	totalSendTime := time.Duration(0)

	scanIDMap := make(map[string]bool)

	// this var tracks the latest scan in the retrived scans
	var latestScanUpdatedAt int64

	for _, scan := range scansList {
		//This map is required as we might have duplicates in the scansList
		//for the containers
		if _, ok := scanIDMap[scan.ScanID]; ok {
			continue
		}
		scanIDMap[scan.ScanID] = true

		if scan.UpdatedAt >= latestScanUpdatedAt {
			latestScanUpdatedAt = scan.UpdatedAt
		}

		profileStart = time.Now()

		results, common, err := reporters_scan.GetScanResults[T](ctx,
			utils.DetectedNodeScanType[intg.Resource], scan.ScanID,
			filters.FieldsFilters, model.FetchWindow{})
		if err != nil {
			return err
		}

		totalQueryTime = totalQueryTime + time.Since(profileStart)

		if len(results) == 0 {
			log.Info().Msgf("No Results filtered for scan id: %s with filters %+v", scan.ScanID, filters)
			continue
		}

		iByte, err := json.Marshal(intg)
		if err != nil {
			return err
		}

		integrationModel, err := integration.GetIntegration(ctx, intg.IntegrationType, iByte)
		if err != nil {
			return err
		}
		var updatedResults []map[string]interface{}
		// inject node details to results
		if integration.IsMessagingFormat(intg.IntegrationType) {
			updatedResults = FormatForMessagingApps(results, intg.Resource)
		} else {
			updatedResults = []map[string]interface{}{}
			for _, r := range results {
				updatedResults = append(updatedResults, utils.ToMap[T](r))
			}
		}

		updatedResults = injectNodeDataMap(updatedResults, common, intg.IntegrationType, ctx)

		extras := utils.ToMap[any](common)
		extras["scan_type"] = intg.Resource

		profileStart = time.Now()

		err = integrationModel.SendNotification(ctx, updatedResults, extras)
		if err != nil {
			updateIntegrationMetrics(ctx, intg,
				integrations.Metrics{Ok: 0, Error: int64(len(updatedResults))})
			return err
		} else {
			updateIntegrationMetrics(ctx, intg,
				integrations.Metrics{Ok: int64(len(updatedResults)), Error: 0})
		}

		totalSendTime = totalSendTime + time.Since(profileStart)

		log.Info().Msgf("Notification sent %s scan %d messages using %s id %d, time taken: %s",
			intg.Resource, len(results), intg.IntegrationType,
			intg.ID, time.Since(profileStart))
	}

	if err := updateLastEventUpdatedAt(ctx, intg.ID, latestScanUpdatedAt); err != nil {
		log.Error().Err(err).Msg("failed to to update last_event_updated_at")
	}

	log.Info().Msgf("%s Total Time taken for integration %s: %s", intg.Resource,
		intg.IntegrationType, time.Since(start))
	log.Debug().Msgf("Time taken for neo4j_query_nc: %s", neo4j_query_nc)
	log.Debug().Msgf("Time taken for neo4j_query_c: %s", neo4j_query_c)
	log.Debug().Msgf("Time taken for neo4j_query_default: %s", neo4j_query_default)
	log.Debug().Msgf("Time taken for neo4j_query_2: %s", totalQueryTime)
	log.Debug().Msgf("Time taken for sending data : %s", totalSendTime)
	return nil
}

func updateLastEventUpdatedAt(ctx context.Context, intgId int32, updatedAt int64) error {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Err(err).Msg("unable to get sql client")
		return err
	}

	last := postgresql_db.UpdateIntegrationLastEventUpdatedAtParams{
		ID: intgId,
		LastEventUpdatedAt: sql.NullTime{
			Time:  time.UnixMilli(updatedAt),
			Valid: true,
		},
	}

	if err := pgClient.UpdateIntegrationLastEventUpdatedAt(ctx, last); err != nil {
		log.Error().Err(err).Msg("failed to update last event updated at")
		return err
	}

	return nil
}

func updateIntegrationMetrics(ctx context.Context, intg postgresql_db.Integration, metrics integrations.Metrics) error {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Err(err).Msg("unable to get sql client")
		return err
	}

	param := postgresql_db.SetIntegrationMetricsParams{
		ID:      intg.ID,
		Metrics: intg.Metrics.Update(metrics),
	}

	if err := pgClient.SetIntegrationMetrics(ctx, param); err != nil {
		log.Error().Err(err).Msg("failed to update last event updated at")
		return err
	}

	return nil
}

func FormatForMessagingApps[T any](results []T, resourceType string) []map[string]interface{} {
	var data []map[string]interface{}
	docFieldsMap := fieldsMap[resourceType]
	for _, r := range results {
		m := utils.ToMap[T](r)
		d := map[string]interface{}{}
		for k, v := range docFieldsMap {
			value, exists := m[k]
			if exists {
				d[v] = value
			}
		}
		data = append(data, d)
	}
	return data
}

func integrationFilters2SearchScanReqs(filters model.IntegrationFilters) (*reporters_search.SearchScanReq,
	*reporters_search.SearchScanReq) {

	scanFilter := reporters_search.SearchFilter{
		Filters: filters.FieldsFilters,
	}

	filterMap := make(map[string][]interface{})
	containerFilterMap := make(map[string][]interface{})

	containerNames := make([]interface{}, len(filters.ContainerNames))
	for i, v := range filters.ContainerNames {
		containerNames[i] = v
	}

	var nodeIDs, nodeTypes []interface{}
	nodeTypeSet := make(map[string]bool)
	for _, v := range filters.NodeIds {
		nodeIDs = append(nodeIDs, v.NodeID)
		if _, ok := nodeTypeSet[v.NodeType]; !ok {
			nodeTypeSet[v.NodeType] = true
			nodeTypes = append(nodeTypes, v.NodeType)
			if v.NodeType == "image" {
				nodeTypeSet["container_image"] = true
				nodeTypes = append(nodeTypes, "container_image")
			}
		}
	}

	if len(nodeIDs) > 0 {
		filterMap["node_id"] = nodeIDs
		filterMap["node_type"] = nodeTypes
	}

	if len(containerNames) > 0 {
		containerFilterMap["node_name"] = containerNames
		containerFilterMap["node_type"] = []interface{}{"container"}
	}

	var reqNC, reqC *reporters_search.SearchScanReq
	if len(filterMap) > 0 {
		reqNC = &reporters_search.SearchScanReq{}
		reqNC.NodeFilter.Filters.ContainsFilter.FieldsValues = filterMap
		reqNC.ScanFilter = scanFilter
		reqNC.Window = model.FetchWindow{}
	}

	if len(containerFilterMap) > 0 {
		reqC = &reporters_search.SearchScanReq{}
		reqC.NodeFilter.Filters.ContainsFilter.FieldsValues = containerFilterMap
		reqC.ScanFilter = scanFilter
		reqC.Window = model.FetchWindow{}
	}

	return reqNC, reqC
}

func injectNodeDataMap(results []map[string]interface{}, common model.ScanResultsCommon,
	integrationType string, ctx context.Context) []map[string]interface{} {

	for _, r := range results {
		//m := utils.ToMap[T](r)
		r["node_id"] = common.NodeID
		r["scan_id"] = common.ScanID
		r["node_name"] = common.NodeName
		r["node_type"] = common.NodeType
		if common.ContainerName != "" {
			r["docker_container_name"] = common.ContainerName
		}
		if common.ImageName != "" {
			r["docker_image_name"] = common.ImageName
		}
		if common.HostName != "" {
			r["host_name"] = common.HostName
			filter := reporters_search.SearchFilter{
				Filters: reporters.FieldsFilters{
					ContainsFilter: reporters.ContainsFilter{
						FieldsValues: map[string][]interface{}{
							"host_name": {common.HostName},
						},
					},
				},
			}
			eFilter := reporters_search.SearchFilter{}
			hosts, err := reporters_search.SearchReport[model.Host](
				ctx, filter, eFilter, nil, model.FetchWindow{})
			if err == nil {
				r["cloud_account_id"] = hosts[0].CloudAccountID
			}
		}
		if common.KubernetesClusterName != "" {
			r["kubernetes_cluster_name"] = common.KubernetesClusterName
		}

		if _, ok := r["updated_at"]; ok {
			flag := integration.IsMessagingFormat(integrationType)
			if flag {
				r["updated_at"] = utils.PrintableTimeStamp(r["updated_at"])
			}
		}

		if _, ok := r["created_at"]; ok {
			flag := integration.IsMessagingFormat(integrationType)
			if flag {
				r["created_at"] = utils.PrintableTimeStamp(r["created_at"])
			}
		}

	}

	return results
}
