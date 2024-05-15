package cronjobs

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"os"
	"strconv"
	"sync"
	"time"

	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
)

const NOTIFICATION_INTERVAL = 60000 //in milliseconds

var (
	NotificationRecordsCounts = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "notification_records_total",
		Help: "Total number of records sent by notification types",
	}, []string{"resource", "type", "status", "namespace"})
)

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
	utils.ScanTypeDetectedNode[utils.NEO4JMalwareScan]: {"class": "Class",
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

func SendNotifications(ctx context.Context, task *asynq.Task) error {
	// //This lock is to ensure only one notification handler runs at a time
	// notificationLock.Lock()
	// defer notificationLock.Unlock()

	log := log.WithCtx(ctx)

	start := time.Now()
	log.Info().Msgf("SendNotifications task for timestamp %s starting", string(task.Payload()))
	defer log.Info().Msgf("SendNotifications task for timestamp %s ended elapsed: %s",
		string(task.Payload()), time.Now().Sub(start))

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf("Error getting postgresCtx: %v", err)
		return nil
	}
	integrations, err := pgClient.GetIntegrations(ctx)
	if err != nil {
		log.Error().Msgf("Error getting postgresCtx: %v", err)
		return nil
	}

	// check if any integrations are configured
	if len(integrations) <= 0 {
		log.Warn().Msg("No integrations configured to notify")
		return nil
	}

	wg := sync.WaitGroup{}
	wg.Add(len(integrations))

	for _, integrationRow := range integrations {
		if integrationRow.ErrorMsg.String != "" &&
			time.Since(integrationRow.LastSentTime.Time) < NotificationErrorBackoff {
			log.Info().Msgf("Skipping integration for %s rowId: %d due to error: %s "+
				"occured at last attempt, %s ago",
				integrationRow.IntegrationType, integrationRow.ID,
				integrationRow.ErrorMsg.String, time.Since(integrationRow.LastSentTime.Time))
			wg.Done()
			continue
		}

		go func(integration postgresql_db.Integration) {
			defer wg.Done()
			log.Info().Msgf("Processing integration for %s rowId: %d",
				integration.IntegrationType, integration.ID)

			err := processIntegrationRow(integration, ctx, task)

			log.Info().Msgf("Processed integration for %s rowId: %d",
				integration.IntegrationType, integration.ID)

			update_row := err != nil || (err == nil && integration.ErrorMsg.Valid)
			if update_row {
				var params postgresql_db.UpdateIntegrationStatusParams
				if err != nil {
					log.Error().Msgf("Error on integration %v", err)
					params = postgresql_db.UpdateIntegrationStatusParams{
						ID: integration.ID,
						ErrorMsg: sql.NullString{
							String: err.Error(),
							Valid:  true,
						},
					}
				} else {
					params = postgresql_db.UpdateIntegrationStatusParams{
						ID: integration.ID,
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
		}(integrationRow)
	}
	wg.Wait()

	return nil
}

func processIntegrationRow(integrationRow postgresql_db.Integration, ctx context.Context, task *asynq.Task) error {
	switch integrationRow.Resource {
	case utils.ScanTypeDetectedNode[utils.NEO4JVulnerabilityScan]:
		return processIntegration[model.Vulnerability](ctx, task, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4JSecretScan]:
		return processIntegration[model.Secret](ctx, task, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4JMalwareScan]:
		return processIntegration[model.Malware](ctx, task, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4JComplianceScan]:
		return processIntegration[model.Compliance](ctx, task, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4JCloudComplianceScan]:
		return processIntegration[model.CloudCompliance](ctx, task, integrationRow)
	}
	return errors.New("No integration type")
}

func injectNodeDatamap(results []map[string]interface{}, common model.ScanResultsCommon,
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

func processIntegration[T any](ctx context.Context, task *asynq.Task, integrationRow postgresql_db.Integration) error {

	log := log.WithCtx(ctx)

	ctx, span := telemetry.NewSpan(ctx, "cronjobs", "process-integration")
	defer span.End()

	startTime := time.Now()
	var filters model.IntegrationFilters
	err := json.Unmarshal(integrationRow.Filters, &filters)
	if err != nil {
		return err
	}

	// get ts from message
	ts, err := strconv.ParseInt(string(task.Payload()), 10, 64)
	if err != nil {
		return err
	}

	last30sTimeStamp := ts - NOTIFICATION_INTERVAL

	log.Debug().Msgf("Check for %s scans to notify at timestamp (%d,%d)",
		integrationRow.Resource, last30sTimeStamp, ts)

	filters.FieldsFilters = reporters.FieldsFilters{}
	filters.FieldsFilters.CompareFilters = append(
		filters.FieldsFilters.CompareFilters,
		reporters.CompareFilter{
			FieldName:   "updated_at",
			GreaterThan: true,
			FieldValue:  strconv.FormatInt(last30sTimeStamp, 10),
		},
	)
	filters.FieldsFilters.ContainsFilter = reporters.ContainsFilter{
		FieldsValues: map[string][]interface{}{"status": {utils.ScanStatusSuccess}},
	}

	scansList := []model.ScanInfo{}
	scanType, ok := utils.DetectedNodeScanType[integrationRow.Resource]
	if !ok {
		log.Error().Msgf("Unsupported scan type in integration: %v", integrationRow)
		return errors.New("Unsupported scan type in integration")
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
	neo4j_query_nc := time.Since(profileStart).Milliseconds()

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
	neo4j_query_c := time.Since(profileStart).Milliseconds()

	neo4j_query_default := int64(0)
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
		neo4j_query_default = time.Since(profileStart).Milliseconds()
	}

	// nothing to notify
	if len(scansList) == 0 {
		log.Info().Msgf("No %s scans to notify at timestamp (%d,%d)",
			integrationRow.Resource, last30sTimeStamp, ts)
		return nil
	}

	log.Info().Msgf("list of %s scans to notify: %+v", integrationRow.Resource, scansList)

	filters = model.IntegrationFilters{}
	err = json.Unmarshal(integrationRow.Filters, &filters)
	if err != nil {
		return err
	}
	filters.NodeIds = []model.NodeIdentifier{}

	totalQueryTime := int64(0)
	totalSendTime := int64(0)

	scanIDMap := make(map[string]bool)
	for _, scan := range scansList {
		//This map is required as we might have duplicates in the scansList
		//for the containers
		if _, ok := scanIDMap[scan.ScanID]; ok {
			continue
		}
		scanIDMap[scan.ScanID] = true

		profileStart = time.Now()
		results, common, err := reporters_scan.GetScanResults[T](ctx,
			utils.DetectedNodeScanType[integrationRow.Resource], scan.ScanID,
			filters.FieldsFilters, model.FetchWindow{})
		if err != nil {
			return err
		}
		totalQueryTime = totalQueryTime + time.Since(profileStart).Milliseconds()

		if len(results) == 0 {
			log.Info().Msgf("No Results filtered for scan id: %s with filters %+v", scan.ScanID, filters)
			continue
		}

		iByte, err := json.Marshal(integrationRow)
		if err != nil {
			return err
		}

		integrationModel, err := integration.GetIntegration(ctx, integrationRow.IntegrationType, iByte)
		if err != nil {
			return err
		}
		var updatedResults []map[string]interface{}
		// inject node details to results
		if integration.IsMessagingFormat(integrationRow.IntegrationType) {
			updatedResults = FormatForMessagingApps(results, integrationRow.Resource)
		} else {
			updatedResults = []map[string]interface{}{}
			for _, r := range results {
				updatedResults = append(updatedResults, utils.ToMap[T](r))
			}
		}
		updatedResults = injectNodeDatamap(updatedResults, common, integrationRow.IntegrationType, ctx)
		messageByte, err := json.Marshal(updatedResults)
		if err != nil {
			return err
		}

		extras := utils.ToMap[any](common)
		extras["scan_type"] = integrationRow.Resource

		profileStart = time.Now()
		err = integrationModel.SendNotification(ctx, string(messageByte), extras)
		totalSendTime = totalSendTime + time.Since(profileStart).Milliseconds()
		if err != nil {
			NotificationRecordsCounts.WithLabelValues(
				integrationRow.Resource,
				integrationRow.IntegrationType,
				"error",
				func() string {
					ns, _ := directory.ExtractNamespace(ctx)
					return string(ns)
				}(),
			).Add(float64(len(updatedResults)))
			return err
		}
		NotificationRecordsCounts.WithLabelValues(
			integrationRow.Resource,
			integrationRow.IntegrationType,
			"success",
			func() string {
				ns, _ := directory.ExtractNamespace(ctx)
				return string(ns)
			}(),
		).Add(float64(len(updatedResults)))
		log.Info().Msgf("Notification sent %s scan %d messages using %s id %d, time taken:%d",
			integrationRow.Resource, len(results), integrationRow.IntegrationType,
			integrationRow.ID, time.Since(profileStart).Milliseconds())
	}
	log.Info().Msgf("%s Total Time taken for integration %s: %d", integrationRow.Resource,
		integrationRow.IntegrationType, time.Since(startTime).Milliseconds())
	log.Debug().Msgf("Time taken for neo4j_query_nc: %d", neo4j_query_nc)
	log.Debug().Msgf("Time taken for neo4j_query_c: %d", neo4j_query_c)
	log.Debug().Msgf("Time taken for neo4j_query_default: %d", neo4j_query_default)
	log.Debug().Msgf("Time taken for neo4j_query_2: %d", totalQueryTime)
	log.Debug().Msgf("Time taken for sending data : %d", totalSendTime)
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
