package cronjobs

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"
	"sync"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

var fieldsMap = map[string]map[string]string{utils.ScanTypeDetectedNode[utils.NEO4J_VULNERABILITY_SCAN]: {
	"cve_severity": "Severity", "cve_id": "CVE Id", "cve_description": "Description", "scan_id": "Scan ID",
	"cve_container_image": "Container image", "@timestamp": "@timestamp", "cve_attack_vector": "Attack Vector",
	"cve_container_name": "Container Name", "host_name": "Host Name", "cve_overall_score": "CVE Overall Score",
	"cve_type": "CVE Type", "cve_link": "CVE Link", "cve_fixed_in": "CVE Fixed In", "cve_cvss_score": "CVSS Score",
	"cve_caused_by_package": "CVE Caused By Package"},
	utils.ScanTypeDetectedNode[utils.NEO4J_SECRET_SCAN]: {
		"LayerID": "Layer ID", "RuleName": "Rule Name", "PartToMatch": "Part to Match", "Match": "Match",
		"scan_id": "Scan ID",
		"Regex":   "Regex", "container_image": "Container image", "@timestamp": "@timestamp",
		"container_name": "Container Name", "node_name": "Node Name",
		"image_id": "Image ID", "node_type": "Node Type", "registry_id": "Registry ID",
		"MatchFromByte": "match from byte",
		"MatchToByte":   "match to byte", "MatchedContents": "Matched Contents", "host_name": "Host Name",
		"kubernetes_cluster_name": "Kubernetes Cluster Name", "masked": "masked",
		"CompleteFilename": "Complete File Name", "MetaRules": "Meta Rules", "Summary": "Summary", "Class": "Class",
		"SeverityScore": "Severity Score", "Severity": "Severity", "PrintBufferStartIndex": "Print Buffer Start Index"},
	utils.ScanTypeDetectedNode[utils.NEO4J_MALWARE_SCAN]: {
		"LayerID": "Layer ID", "RuleName": "Rule Name", "StringsToMatch": "Strings to Match", "scan_id": "Scan ID",
		"CategoryName": "Category Name", "container_image": "Container image",
		"@timestamp": "@timestamp", "node_name": "Node Name",
		"image_id": "Image ID", "node_type": "Node Type", "registry_id": "Registry ID",
		"container_name": "Container Name",
		"host_name":      "Host Name", "kubernetes_cluster_name": "Kubernetes Cluster Name", "masked": "masked",
		"Meta":             "Meta",
		"CompleteFilename": "Complete File Name", "MetaRules": "Meta Rules", "Summary": "Summary", "Class": "Class",
		"SeverityScore": "Severity Score", "Severity": "Severity", "FileSeverity": "File Severity",
		"FileSevScore": "File Severity Score"},
	utils.ScanTypeDetectedNode[utils.NEO4J_COMPLIANCE_SCAN]: {
		"@timestamp":            "@timestamp",
		"account_id":            "Account",
		"cloud_provider":        "Cloud Provider",
		"compliance_check_type": "Compliance Check Type",
		"control_id":            "Control Id",
		"description":           "Description",
		"host_name":             "Host Name",
		"node_name":             "Node",
		"reason":                "Reason",
		"region":                "Region",
		"resource":              "Resource",
		"service":               "Service",
		"status":                "Test Status",
		"test_category":         "Test Category",
		"test_info":             "Info",
		"test_number":           "Test ID",
		"title":                 "Title"},
}

func SendNotifications(msg *message.Message) error {
	RecordOffsets(msg)

	log.Info().Msgf("SendNotifications task starting at %s", string(msg.Payload))
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
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
			err := processIntegrationRow(integration, msg)
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
	log.Info().Msgf("SendNotifications task ended for timestamp %s", string(msg.Payload))
	return nil
}

func processIntegrationRow(integrationRow postgresql_db.Integration, msg *message.Message) error {
	log.Info().Msgf("Processing integration for %s rowId: %d", integrationRow.IntegrationType, integrationRow.ID)
	switch integrationRow.Resource {
	case utils.ScanTypeDetectedNode[utils.NEO4J_VULNERABILITY_SCAN]:
		return processIntegration[model.Vulnerability](msg, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4J_SECRET_SCAN]:
		return processIntegration[model.Secret](msg, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4J_MALWARE_SCAN]:
		return processIntegration[model.Malware](msg, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4J_COMPLIANCE_SCAN]:
		err1 := processIntegration[model.Compliance](msg, integrationRow)
		// cloud compliance scans
		integrationRow.Resource = utils.ScanTypeDetectedNode[utils.NEO4J_CLOUD_COMPLIANCE_SCAN]
		err2 := processIntegration[model.CloudCompliance](msg, integrationRow)
		return errors.Join(err1, err2)
	}
	return errors.New("No integration type")
}

func injectNodeDatamap(results []map[string]interface{}, common model.ScanResultsCommon,
	integrationType string) []map[string]interface{} {

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

func processIntegration[T any](msg *message.Message, integrationRow postgresql_db.Integration) error {
	var filters model.IntegrationFilters
	err := json.Unmarshal(integrationRow.Filters, &filters)
	if err != nil {
		return err
	}
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	// get ts from message
	ts, err := strconv.ParseInt(string(msg.Payload), 10, 64)
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
	list, err := reporters_scan.GetScansList(ctx, utils.DetectedNodeScanType[integrationRow.Resource],
		filters.NodeIds, filters.FieldsFilters, model.FetchWindow{})
	if err != nil {
		return err
	}

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
	for _, scan := range list.ScansInfo {
		results, common, err := reporters_scan.GetScanResults[T](ctx,
			utils.DetectedNodeScanType[integrationRow.Resource], scan.ScanId,
			filters.FieldsFilters, model.FetchWindow{})
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
				updatedResults = append(updatedResults, utils.ToMap[T](r))
			}
		}
		updatedResults = injectNodeDatamap(updatedResults, common, integrationRow.IntegrationType)
		messageByte, err := json.Marshal(updatedResults)
		if err != nil {
			return err
		}

		extras := utils.ToMap[any](common)
		extras["scan_type"] = integrationRow.Resource
		err = integrationModel.SendNotification(ctx, string(messageByte), extras)
		if err != nil {
			return err
		}
		log.Info().Msgf("Notification sent %s scan %d messages using %s id %d",
			integrationRow.Resource, len(results), integrationRow.IntegrationType, integrationRow.ID)
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
			d[v] = m[k]
		}
		data = append(data, d)
	}
	return data
}
