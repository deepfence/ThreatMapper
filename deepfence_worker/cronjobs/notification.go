package cronjobs

import (
	"encoding/json"
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
		log.Error().Msgf("Error getting postgresCtx", err)
		return nil
	}
	wg := new(sync.WaitGroup)
	wg.Add(len(integrations))
	for _, integrationRow := range integrations {
		go processIntegrationRow(wg, integrationRow, msg)
	}
	wg.Wait()
	log.Info().Msgf("SendNotifications task ended for timestamp %s", string(msg.Payload))
	return nil
}

func processIntegrationRow(wg *sync.WaitGroup, integrationRow postgresql_db.Integration, msg *message.Message) {
	defer wg.Done()

	log.Info().Msgf("Processing integration for %s rowId: %d", integrationRow.IntegrationType, integrationRow.ID)
	switch integrationRow.Resource {
	case utils.ScanTypeDetectedNode[utils.NEO4J_VULNERABILITY_SCAN]:
		processIntegration[model.Vulnerability](msg, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4J_SECRET_SCAN]:
		processIntegration[model.Secret](msg, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4J_MALWARE_SCAN]:
		processIntegration[model.Malware](msg, integrationRow)
	case utils.ScanTypeDetectedNode[utils.NEO4J_COMPLIANCE_SCAN]:
		processIntegration[model.Compliance](msg, integrationRow)
		// cloud compliance scans
		integrationRow.Resource = utils.ScanTypeDetectedNode[utils.NEO4J_CLOUD_COMPLIANCE_SCAN]
		processIntegration[model.CloudCompliance](msg, integrationRow)
	}

	log.Info().Msgf("Processed integration for %s rowId: %d", integrationRow.IntegrationType, integrationRow.ID)
}

func injectNodeData[T any](results []T, common model.ScanResultsCommon,
	integrationType string) []map[string]interface{} {
	data := []map[string]interface{}{}

	for _, r := range results {
		m := utils.ToMap[T](r)
		m["node_id"] = common.NodeID
		m["scan_id"] = common.ScanID
		m["node_name"] = common.NodeName
		m["node_type"] = common.NodeType
		if common.ContainerName != "" {
			m["docker_container_name"] = common.ContainerName
		}
		if common.ImageName != "" {
			m["docker_image_name"] = common.ImageName
		}
		if common.HostName != "" {
			m["host_name"] = common.HostName
		}
		if common.KubernetesClusterName != "" {
			m["kubernetes_cluster_name"] = common.KubernetesClusterName
		}

		if _, ok := m["updated_at"]; ok {
			flag := integration.IsMessagingFormat(integrationType)
			if flag == true {
				ts := m["updated_at"].(int64)
				tm := time.Unix(0, ts*int64(time.Millisecond))
				m["updated_at"] = tm
			}
		}

		data = append(data, m)
	}

	return data
}

func processIntegration[T any](msg *message.Message, integrationRow postgresql_db.Integration) {

	startTime := time.Now()
	var filters model.IntegrationFilters
	err := json.Unmarshal(integrationRow.Filters, &filters)
	if err != nil {
		log.Error().Msg(err.Error())
		return
	}
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	// get ts from message
	ts, err := strconv.ParseInt(string(msg.Payload), 10, 64)
	if err != nil {
		log.Error().Msg(err.Error())
		return
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
		log.Error().Msg(err.Error())
		return
	}
	neo4j_query_1 := time.Since(profileStart).Milliseconds()

	// nothing to notify
	if len(list.ScansInfo) == 0 {
		log.Info().Msgf("No %s scans to notify at timestamp (%d,%d)",
			integrationRow.Resource, last30sTimeStamp, ts)
		return
	}

	log.Info().Msgf("list of %s scans to notify: %+v", integrationRow.Resource, list)

	filters = model.IntegrationFilters{}
	err = json.Unmarshal(integrationRow.Filters, &filters)
	if err != nil {
		log.Error().Msg(err.Error())
		return
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
			log.Error().Msgf("Error marshall integrationRow: %+v", integrationRow, err)
			return
		}

		integrationModel, err := integration.GetIntegration(ctx, integrationRow.IntegrationType, iByte)
		if err != nil {
			log.Error().Msgf("Error GetIntegration: %+v", integrationRow, err)
			return
		}

		// inject node details to results
		updatedResults := injectNodeData[T](results, common, integrationRow.IntegrationType)
		messageByte, err := json.Marshal(updatedResults)
		if err != nil {
			log.Error().Msgf("Error marshall results: %+v", integrationRow, err)
			return
		}

		extras := utils.ToMap[any](common)
		extras["scan_type"] = integrationRow.Resource

		profileStart = time.Now()
		err = integrationModel.SendNotification(ctx, string(messageByte), extras)
		totalSendTime = totalSendTime + time.Since(profileStart).Milliseconds()
		if err != nil {
			log.Error().Msgf("Error Sending Notification id %d, resource %s, type %s error: %s",
				integrationRow.ID, integrationRow.Resource, integrationRow.IntegrationType, err)
			return
		}
		log.Info().Msgf("Notification sent %s scan %d messages using %s id %d",
			integrationRow.Resource, len(results), integrationRow.IntegrationType, integrationRow.ID)
	}
	log.Info().Msgf("%s Total Time taken for integration %s: %d", integrationRow.Resource,
		integrationRow.IntegrationType, time.Since(startTime).Milliseconds())
	log.Info().Msgf("Time taken for neo4j_query_1: %d", neo4j_query_1)
	log.Info().Msgf("Time taken for neo4j_query_2: %d", totalQueryTime)
	log.Info().Msgf("Time taken for sending data : %d", totalSendTime)
}
