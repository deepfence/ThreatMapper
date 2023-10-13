package cronjobs

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"strconv"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
)

var fieldsMap = map[string]map[string]string{utils.ScanTypeDetectedNode[utils.NEO4J_VULNERABILITY_SCAN]: {
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
	"node_id":               "Node ID"},
	utils.ScanTypeDetectedNode[utils.NEO4J_SECRET_SCAN]: {
		"node_id":            "Node ID",
		"full_filename":      "File Name",
		"matched_content":    "Matched Content",
		"level":              "Level",
		"score":              "Score",
		"rule_id":            "Rule",
		"name":               "Name",
		"part":               "Part",
		"signature_to_match": "Matched Signature"},
	utils.ScanTypeDetectedNode[utils.NEO4J_MALWARE_SCAN]: {"class": "Class",
		"complete_filename": "File Name",
		"file_sev_score":    "File Severity Score",
		"file_severity":     "File Severity",
		"image_layer_id":    "Image Layer ID",
		"node_id":           "Node ID",
		"rule_id":           "Rule ID",
		"rule_name":         "Rule Name",
		"author":            "Author",
		"severity_score":    "Severity Score",
		"summary":           "Summary"},
	utils.ScanTypeDetectedNode[utils.NEO4J_COMPLIANCE_SCAN]: {
		"compliance_check_type": "Compliance Check Type",
		"resource":              "Resource",
		"status":                "Test Status",
		"test_category":         "Test Category",
		"description":           "Description",
		"test_number":           "Test ID",
		"test_desc":             "Info"},
	utils.ScanTypeDetectedNode[utils.NEO4J_CLOUD_COMPLIANCE_SCAN]: {
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

var notificationLock sync.Mutex

func SendNotifications(ctx context.Context, task *asynq.Task) error {
	//This lock is to ensure only one notification handler runs at a time
	notificationLock.Lock()
	defer notificationLock.Unlock()

	log.Info().Msgf("SendNotifications task starting at %s", string(task.Payload()))
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return nil
	}
	integrations, err := pgClient.GetIntegrations(ctx)
	if err != nil {
		log.Error().Msgf("Error getting postgresCtx: %v", err)
		return nil
	}
	wg := sync.WaitGroup{}
	wg.Add(len(integrations))
	for _, integrationRow := range integrations {
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
				pgClient.UpdateIntegrationStatus(ctx, params)
			}
		}(integrationRow)
	}
	wg.Wait()
	log.Info().Msgf("SendNotifications task ended for timestamp %s", string(task.Payload()))
	return nil
}

func processIntegrationRow(integrationRow postgresql_db.Integration, ctx context.Context, task *asynq.Task) error {
	switch integrationRow.Resource {
	case utils.ScanTypeDetectedNode[utils.NEO4J_VULNERABILITY_SCAN]:
		return processIntegration[model.Vulnerability](ctx, task, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4J_SECRET_SCAN]:
		return processIntegration[model.Secret](ctx, task, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4J_MALWARE_SCAN]:
		return processIntegration[model.Malware](ctx, task, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4J_COMPLIANCE_SCAN]:
		err1 := processIntegration[model.Compliance](ctx, task, integrationRow)
		// cloud compliance scans
		integrationRow.Resource = utils.ScanTypeDetectedNode[utils.NEO4J_CLOUD_COMPLIANCE_SCAN]
		err2 := processIntegration[model.CloudCompliance](ctx, task, integrationRow)
		return errors.Join(err1, err2)
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
			if flag == true {
				ts := r["updated_at"].(int64)
				tm := time.Unix(0, ts*int64(time.Millisecond))
				r["updated_at"] = tm
			}
		}

	}

	return results
}

func processIntegration[T any](ctx context.Context, task *asynq.Task, integrationRow postgresql_db.Integration) error {
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

	last30sTimeStamp := ts - 30000

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
		FieldsValues: map[string][]interface{}{"status": {utils.SCAN_STATUS_SUCCESS}},
	}

	profileStart := time.Now()
	list, err := reporters_scan.GetScansList(ctx, utils.DetectedNodeScanType[integrationRow.Resource],
		filters.NodeIds, filters.FieldsFilters, model.FetchWindow{})
	if err != nil {
		return err
	}
	neo4j_query_1 := time.Since(profileStart).Milliseconds()

	// nothing to notify
	if len(list.ScansInfo) == 0 {
		log.Info().Msgf("No %s scans to notify at timestamp (%d,%d)",
			integrationRow.Resource, last30sTimeStamp, ts)
		return nil
	}

	log.Info().Msgf("list of %s scans to notify: %+v", integrationRow.Resource, list)

	filters = model.IntegrationFilters{}
	err = json.Unmarshal(integrationRow.Filters, &filters)
	if err != nil {
		return err
	}
	filters.NodeIds = []model.NodeIdentifier{}

	totalQueryTime := int64(0)
	totalSendTime := int64(0)

	for _, scan := range list.ScansInfo {
		profileStart = time.Now()
		results, common, err := reporters_scan.GetScanResults[T](ctx,
			utils.DetectedNodeScanType[integrationRow.Resource], scan.ScanId,
			filters.FieldsFilters, model.FetchWindow{})
		totalQueryTime = totalQueryTime + time.Since(profileStart).Milliseconds()

		if len(results) == 0 {
			log.Info().Msgf("No Results filtered for scan id: %s with filters %+v", scan.ScanId, filters)
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
			for _, r := range results {
				updatedResults = []map[string]interface{}{}
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
			return err
		}
		log.Info().Msgf("Notification sent %s scan %d messages using %s id %d, time taken:%d",
			integrationRow.Resource, len(results), integrationRow.IntegrationType,
			integrationRow.ID, time.Since(profileStart).Milliseconds())
	}
	log.Info().Msgf("%s Total Time taken for integration %s: %d", integrationRow.Resource,
		integrationRow.IntegrationType, time.Since(startTime).Milliseconds())
	log.Debug().Msgf("Time taken for neo4j_query_1: %d", neo4j_query_1)
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
