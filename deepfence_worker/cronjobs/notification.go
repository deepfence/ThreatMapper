package cronjobs

import (
	"encoding/json"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	postgresql_db "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"strconv"
	"time"
)

func SendNotifications(msg *message.Message) error {
	postgresCtx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(postgresCtx)
	if err != nil {
		return err
	}

	integrations, err := pgClient.GetIntegrations(postgresCtx)
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
				return err
			}
			integrationRow.Resource = utils.ScanTypeDetectedNode[utils.NEO4J_CLOUD_COMPLIANCE_SCAN]
			err = processIntegration[model.CloudCompliance](msg, integrationRow)
		}
	}
	return err
}

func processIntegration[T any](msg *message.Message, integrationRow postgresql_db.Integration) error {
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	last30sTimeStamp := time.Now().UnixMilli() - 30000
	ff := reporters.FieldsFilters{CompareFilters: []reporters.CompareFilter{{FieldName: "updated_at", GreaterThan: true, FieldValue: strconv.FormatInt(last30sTimeStamp, 10)}}}
	list, err := reporters_scan.GetScansList(ctx, utils.DetectedNodeScanType[integrationRow.Resource], []model.NodeIdentifier{}, ff, model.FetchWindow{}, []string{"COMPLETE"})
	if err != nil {
		return err
	}
	var fieldsFilters reporters.FieldsFilters
	err = json.Unmarshal(integrationRow.Filters, &fieldsFilters)
	if err != nil {
		return err
	}
	for _, scan := range list.ScansInfo {
		results, _, err := reporters_scan.GetScanResults[T](ctx, utils.DetectedNodeScanType[integrationRow.Resource], scan.ScanId, fieldsFilters, model.FetchWindow{})
		iByte, err := json.Marshal(integrationRow)
		if err != nil {
			log.Error().Msgf("Error Processing for integration json marshall integrationRow: +%v", integrationRow, err)
			return err
		}
		integrationModel, err := integration.GetIntegration(integrationRow.IntegrationType, iByte)
		if err != nil {
			log.Error().Msgf("Error Processing for integration GetIntegration: +%v", integrationRow, err)
			return err
		}
		messageByte, err := json.Marshal(results)
		if err != nil {
			log.Error().Msgf("Error Processing for integration json marshall results: +%v", integrationRow, err)
			return err
		}
		err = integrationModel.SendNotification(string(messageByte))
		if err != nil {
			log.Error().Msgf("Error Sending Notification: +%v", integrationRow, err)
			return err
		}
		log.Info().Msgf("Sent %d messages in notification", len(results))
	}
	return err
}
