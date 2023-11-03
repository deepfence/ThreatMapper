package cronjobs

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/handler"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
)

func RunScheduledTasks(ctx context.Context, task *asynq.Task) error {
	messagePayload := map[string]interface{}{}
	if err := json.Unmarshal(task.Payload(), &messagePayload); err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	log.Info().Msgf("RunScheduledTasks: %s", messagePayload["description"])
	log.Info().Msgf("RunScheduledTasks: %v", messagePayload)

	scheduleId := int64(messagePayload["id"].(float64))
	jobStatus := "Success"
	isSystem := messagePayload["is_system"].(bool)
	var err error
	if isSystem {
		err = runSystemScheduledTasks(ctx, messagePayload)
	} else {
		err = runCustomScheduledTasks(ctx, messagePayload)
	}
	if err != nil {
		jobStatus = err.Error()
		log.Error().Msg("RunScheduledTasks: " + err.Error())
	}
	err = saveJobStatus(ctx, scheduleId, jobStatus)
	if err != nil {
		log.Error().Msg("RunScheduledTasks saveJobStatus: " + err.Error())
	}
	return nil
}

var (
	complianceBenchmarkTypes = map[string][]string{
		utils.NodeTypeCloudNode:         {"cis"},
		utils.NodeTypeKubernetesCluster: {"nsa-cisa"},
		utils.NodeTypeHost:              {"hipaa", "gdpr", "pci", "nist"},
	}
)

func runSystemScheduledTasks(ctx context.Context, messagePayload map[string]interface{}) error {
	payload := messagePayload["payload"].(map[string]interface{})
	nodeType := payload["node_type"].(string)

	searchFilter := reporters_search.SearchFilter{
		InFieldFilter: []string{"node_id"},
		Filters: reporters.FieldsFilters{
			ContainsFilter: reporters.ContainsFilter{
				FieldsValues: map[string][]interface{}{"pseudo": {false}, "active": {true}},
			},
		},
	}

	extSearchFilter := reporters_search.SearchFilter{}
	fetchWindow := model.FetchWindow{Offset: 0, Size: 10000}
	nodeIds := []model.NodeIdentifier{}
	switch nodeType {
	case utils.NodeTypeHost:
		searchFilter.Filters.ContainsFilter.FieldsValues["agent_running"] = []interface{}{true}
		nodes, err := reporters_search.SearchReport[model.Host](ctx, searchFilter, extSearchFilter, nil, fetchWindow)
		if err != nil {
			return err
		}
		for _, node := range nodes {
			nodeIds = append(nodeIds, model.NodeIdentifier{NodeId: node.ID, NodeType: controls.ResourceTypeToString(controls.Host)})
		}
	case utils.NodeTypeContainer:
		nodes, err := reporters_search.SearchReport[model.Container](ctx, searchFilter, extSearchFilter, nil, fetchWindow)
		if err != nil {
			return err
		}
		for _, node := range nodes {
			nodeIds = append(nodeIds, model.NodeIdentifier{NodeId: node.ID, NodeType: controls.ResourceTypeToString(controls.Container)})
		}
	case utils.NodeTypeContainerImage:
		nodes, err := reporters_search.SearchReport[model.ContainerImage](ctx, searchFilter, extSearchFilter, nil, fetchWindow)
		if err != nil {
			return err
		}
		for _, node := range nodes {
			nodeIds = append(nodeIds, model.NodeIdentifier{NodeId: node.ID, NodeType: controls.ResourceTypeToString(controls.Image)})
		}
	case utils.NodeTypeKubernetesCluster:
		searchFilter.Filters.ContainsFilter.FieldsValues["agent_running"] = []interface{}{true}
		nodes, err := reporters_search.SearchReport[model.KubernetesCluster](ctx, searchFilter, extSearchFilter, nil, fetchWindow)
		if err != nil {
			return err
		}
		for _, node := range nodes {
			nodeIds = append(nodeIds, model.NodeIdentifier{NodeId: node.ID, NodeType: controls.ResourceTypeToString(controls.KubernetesCluster)})
		}
	case utils.NodeTypeCloudNode:
	}

	if len(nodeIds) == 0 {
		log.Info().Msgf("No nodes found for RunScheduledTasks: %s", messagePayload["description"])
		return nil
	}

	scanTrigger := model.ScanTriggerCommon{NodeIds: nodeIds, Filters: model.ScanFilter{}}

	switch messagePayload["action"].(string) {
	case utils.VULNERABILITY_SCAN:
		actionBuilder := handler.StartScanActionBuilder(ctx, ctl.StartVulnerabilityScan, map[string]string{"scan_type": "all"})
		_, _, err := handler.StartMultiScan(ctx, false, utils.NEO4J_VULNERABILITY_SCAN, scanTrigger, actionBuilder)
		if err != nil {
			return err
		}
	case utils.SECRET_SCAN:
		actionBuilder := handler.StartScanActionBuilder(ctx, ctl.StartSecretScan, nil)
		_, _, err := handler.StartMultiScan(ctx, false, utils.NEO4J_SECRET_SCAN, scanTrigger, actionBuilder)
		if err != nil {
			return err
		}
	case utils.MALWARE_SCAN:
		actionBuilder := handler.StartScanActionBuilder(ctx, ctl.StartMalwareScan, nil)
		_, _, err := handler.StartMultiScan(ctx, false, utils.NEO4J_MALWARE_SCAN, scanTrigger, actionBuilder)
		if err != nil {
			return err
		}
	case utils.COMPLIANCE_SCAN, utils.CLOUD_COMPLIANCE_SCAN:
		benchmarkTypes, ok := complianceBenchmarkTypes[nodeType]
		if !ok {
			log.Warn().Msgf("Unknown node type %s for compliance scan", nodeType)
			return nil
		}
		_, _, err := handler.StartMultiCloudComplianceScan(ctx, nodeIds, benchmarkTypes)
		if err != nil {
			return err
		}
	}
	return nil
}

func runCustomScheduledTasks(ctx context.Context, messagePayload map[string]interface{}) error {
	var payload model.ScheduleTaskPayload
	val := messagePayload["payload"].(map[string]interface{})
	payloadRaw, err := json.Marshal(val)
	if err != nil {
		log.Error().Msgf("Failed to marshal the payload, error:%v", err)
		return err
	}

	err = json.Unmarshal(payloadRaw, &payload)
	if err != nil {
		return err
	}

	nodeIds := payload.NodeIds
	scanFilter := payload.Filters
	scheduleJobId := int64(messagePayload["id"].(float64))

	if len(nodeIds) == 0 {
		log.Info().Msgf("No nodes found for CustomScheduledTasks, jobid:%d, description:%s",
			scheduleJobId, messagePayload["description"])
		return nil
	}

	scanTrigger := model.ScanTriggerCommon{NodeIds: nodeIds, Filters: scanFilter}

	action := utils.Neo4jScanType(messagePayload["action"].(string))

	switch action {
	case utils.NEO4J_VULNERABILITY_SCAN:
		binArgs := make(map[string]string, 0)
		if payload.ScanConfigLanguages != nil && len(payload.ScanConfigLanguages) > 0 {
			languages := []string{}
			for _, language := range payload.ScanConfigLanguages {
				languages = append(languages, language.Language)
			}
			binArgs["scan_type"] = strings.Join(languages, ",")
		}

		actionBuilder := handler.StartScanActionBuilder(ctx, ctl.StartVulnerabilityScan, binArgs)
		_, _, err := handler.StartMultiScan(ctx, false, utils.NEO4J_VULNERABILITY_SCAN, scanTrigger, actionBuilder)
		if err != nil {
			return err
		}
	case utils.NEO4J_SECRET_SCAN:
		actionBuilder := handler.StartScanActionBuilder(ctx, ctl.StartSecretScan, nil)
		_, _, err := handler.StartMultiScan(ctx, false, utils.NEO4J_SECRET_SCAN, scanTrigger, actionBuilder)
		if err != nil {
			return err
		}
	case utils.NEO4J_MALWARE_SCAN:
		actionBuilder := handler.StartScanActionBuilder(ctx, ctl.StartMalwareScan, nil)
		_, _, err := handler.StartMultiScan(ctx, false, utils.NEO4J_MALWARE_SCAN, scanTrigger, actionBuilder)
		if err != nil {
			return err
		}
	case utils.NEO4J_COMPLIANCE_SCAN, utils.NEO4J_CLOUD_COMPLIANCE_SCAN:
		if payload.BenchmarkTypes == nil || len(payload.BenchmarkTypes) == 0 {
			log.Warn().Msgf("Invalid benchmarkType for compliance scan, job id: %d", scheduleJobId)
			return nil
		}
		_, _, err := handler.StartMultiCloudComplianceScan(ctx, nodeIds, payload.BenchmarkTypes)
		if err != nil {
			return err
		}
	}
	return nil
}

func saveJobStatus(ctx context.Context, scheduleId int64, jobStatus string) error {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}
	return pgClient.UpdateScheduleStatus(ctx, postgresqlDb.UpdateScheduleStatusParams{
		Status: jobStatus,
		ID:     scheduleId,
	})
}
