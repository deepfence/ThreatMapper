package cronjobs

import (
	"encoding/json"
	"strconv"
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
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}
	integrations, err := pgClient.GetIntegrations(ctx)
	if err != nil {
		log.Error().Msgf("Error in getting postgresCtx", err)
		return err
	}
	for _, integrationRow := range integrations {
		switch integrationRow.Resource {
		case utils.ScanTypeDetectedNode[utils.NEO4J_VULNERABILITY_SCAN]:
			err = processIntegration[model.Vulnerability](msg, integrationRow)
		case utils.ScanTypeDetectedNode[utils.NEO4J_SECRET_SCAN]:
			err = processIntegration[model.Secret](msg, integrationRow)
		case utils.ScanTypeDetectedNode[utils.NEO4J_MALWARE_SCAN]:
			err = processIntegration[model.Malware](msg, integrationRow)
		case utils.ScanTypeDetectedNode[utils.NEO4J_COMPLIANCE_SCAN]:
			err = processIntegration[model.Compliance](msg, integrationRow)
			if err != nil {
				log.Error().Msgf("Error in processing  integration %v", err)
				return err
			}
			integrationRow.Resource = utils.ScanTypeDetectedNode[utils.NEO4J_CLOUD_COMPLIANCE_SCAN]
			err = processIntegration[model.CloudCompliance](msg, integrationRow)
		}
	}
	return err
}

func processIntegration[T any](msg *message.Message, integrationRow postgresql_db.Integration) error {
	var filters model.IntegrationFilters
	err := json.Unmarshal(integrationRow.Filters, &filters)
	if err != nil {
		return err
	}
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	last30sTimeStamp := time.Now().UnixMilli() - 30000
	filters.FieldsFilters = reporters.FieldsFilters{}
	filters.FieldsFilters.CompareFilters = append(filters.FieldsFilters.CompareFilters, reporters.CompareFilter{FieldName: "updated_at", GreaterThan: true, FieldValue: strconv.FormatInt(last30sTimeStamp, 10)})
	filters.FieldsFilters.ContainsFilter = reporters.ContainsFilter{FieldsValues: map[string][]interface{}{"status": {"COMPLETE"}}}
	list, err := reporters_scan.GetScansList(ctx, utils.DetectedNodeScanType[integrationRow.Resource], filters.NodeIds, filters.FieldsFilters, model.FetchWindow{})
	if err != nil {
		return err
	}
	filters = model.IntegrationFilters{}
	err = json.Unmarshal(integrationRow.Filters, &filters)
	if err != nil {
		return err
	}
	filters.NodeIds = []model.NodeIdentifier{}
	for _, scan := range list.ScansInfo {
		results, common, err := reporters_scan.GetScanResults[T](ctx, utils.DetectedNodeScanType[integrationRow.Resource], scan.ScanId, filters.FieldsFilters, model.FetchWindow{})
		if len(results) == 0 {
			log.Info().Msgf("No Results filtered for scan id:%s with filters %+v", scan.ScanId, filters)
			continue
		}
		iByte, err := json.Marshal(integrationRow)
		if err != nil {
			log.Error().Msgf("Error Processing for integration json marshall integrationRow: %+v", integrationRow, err)
			return err
		}
		integrationModel, err := integration.GetIntegration(integrationRow.IntegrationType, iByte)
		if err != nil {
			log.Error().Msgf("Error Processing for integration GetIntegration: %+v", integrationRow, err)
			return err
		}
		messageByte, err := json.Marshal(results)
		if err != nil {
			log.Error().Msgf("Error Processing for integration json marshall results: %+v", integrationRow, err)
			return err
		}
		err = integrationModel.SendNotification(ctx, string(messageByte), map[string]interface{}{"node_id": common.ScanID})
		if err != nil {
			log.Error().Msgf("Error Sending Notification: %+v", integrationRow, err)
			return err
		}
		log.Info().Msgf("Sent %d messages in %s notification", len(results), integrationRow.IntegrationType)
	}
	return err
}
