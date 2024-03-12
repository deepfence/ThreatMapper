package reporters_scan //nolint:stylecheck

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/integration"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

func Notify[T any](ctx context.Context, res []T, common model.ScanResultsCommon, scanType string, integrationIDs []int32) error {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return nil
	}
	var integrations []postgresql_db.Integration
	// get all integration if integrationIDs is empty, else get only the integrations in integrationIDs
	if len(integrationIDs) == 0 {
		integrations, err = pgClient.GetIntegrations(ctx)
		if err != nil {
			log.Error().Msgf("Error getting postgresCtx: %v", err)
			return err
		}
	} else {
		integrations, err = pgClient.GetIntegrationsFromIDs(ctx, integrationIDs)
		if err != nil {
			log.Error().Msgf("Error getting postgresCtx: %v", err)
			return err
		}
	}

	neo4jScanType := utils.StringToNeo4jScanType(scanType)
	for _, integrationRow := range integrations {
		if utils.ScanTypeDetectedNode[neo4jScanType] != integrationRow.Resource {
			continue
		}

		log.Info().Msgf("Processing integration for %s rowId: %d",
			integrationRow.IntegrationType, integrationRow.ID)

		iByte, err := json.Marshal(integrationRow)
		if err != nil {
			log.Error().Msgf("Error marshalling integrationRow: %v", err)
			return err
		}

		// inject node details to results
		updatedResults := injectNodeData[T](res, common, integrationRow.IntegrationType)
		messageByte, err := json.MarshalIndent(updatedResults, "", "  ")
		if err != nil {
			log.Error().Msgf("Error marshalling message: %v", err)
			return err
		}

		integrationModel, err := integration.GetIntegration(ctx, integrationRow.IntegrationType, iByte)
		if err != nil {
			log.Error().Msgf("Error getting integration: %v", err)
			return err
		}

		extras := ConvertScanResultsCommonToMap(common)

		// add scantype
		extras["scan_type"] = scanType

		err = integrationModel.SendNotification(ctx, string(messageByte), extras)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}

	return nil
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
			if flag {
				m["updated_at"] = utils.PrintableTimeStamp(m["updated_at"])
			}
		}

		data = append(data, m)
	}

	return data
}

// ConvertScanResultsCommonToMap converts ScanResultsCommon to map[string]interface{}
func ConvertScanResultsCommonToMap(scanResults model.ScanResultsCommon) map[string]interface{} {
	resultMap := make(map[string]interface{})
	resultMap["docker_container_name"] = scanResults.ContainerName
	resultMap["docker_image_name"] = scanResults.ImageName
	resultMap["host_name"] = scanResults.HostName
	resultMap["kubernetes_cluster_name"] = scanResults.KubernetesClusterName
	resultMap["node_id"] = scanResults.NodeID
	resultMap["node_name"] = scanResults.NodeName
	resultMap["node_type"] = scanResults.NodeType
	resultMap["scan_id"] = scanResults.ScanID
	resultMap["updated_at"] = scanResults.UpdatedAt
	resultMap["created_at"] = scanResults.CreatedAt
	return resultMap
}
