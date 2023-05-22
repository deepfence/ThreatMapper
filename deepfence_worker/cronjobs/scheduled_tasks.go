package cronjobs

import (
	"encoding/json"
	"strconv"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_server/handler"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	reporters_search "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/golang_deepfence_sdk/utils/controls"
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

func RunScheduledTasks(msg *message.Message) error {
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	messagePayload := map[string]interface{}{}
	if err := json.Unmarshal(msg.Payload, &messagePayload); err != nil {
		log.Error().Msg(err.Error())
		return nil
	}

	nodeIds := []model.NodeIdentifier{}
	payload := messagePayload["payload"].(map[string]interface{})
	nodeType := payload["node_type"].(string)
	searchFilter := reporters_search.SearchFilter{
		InFieldFilter: []string{"node_id"},
		Filters: reporters.FieldsFilters{
			ContainsFilter: reporters.ContainsFilter{
				FieldsValues: map[string][]interface{}{"pseudo": {false}},
			},
		},
	}
	fetchWindow := model.FetchWindow{Offset: 0, Size: 10000}

	switch nodeType {
	case utils.NodeTypeHost:
		nodes, err := reporters_search.SearchReport[model.Host](ctx, searchFilter, fetchWindow)
		if err != nil {
			log.Error().Msg(err.Error())
			return nil
		}
		for _, node := range nodes {
			nodeIds = append(nodeIds, model.NodeIdentifier{NodeId: node.ID, NodeType: controls.ResourceTypeToString(controls.Host)})
		}
	case utils.NodeTypeContainer:
		nodes, err := reporters_search.SearchReport[model.Host](ctx, searchFilter, fetchWindow)
		if err != nil {
			log.Error().Msg(err.Error())
			return nil
		}
		for _, node := range nodes {
			nodeIds = append(nodeIds, model.NodeIdentifier{NodeId: node.ID, NodeType: controls.ResourceTypeToString(controls.Container)})
		}
	case utils.NodeTypeContainerImage:
		nodes, err := reporters_search.SearchReport[model.Host](ctx, searchFilter, fetchWindow)
		if err != nil {
			log.Error().Msg(err.Error())
			return nil
		}
		for _, node := range nodes {
			nodeIds = append(nodeIds, model.NodeIdentifier{NodeId: node.ID, NodeType: controls.ResourceTypeToString(controls.Image)})
		}
	case utils.NodeTypeKubernetesCluster:
		nodes, err := reporters_search.SearchReport[model.Host](ctx, searchFilter, fetchWindow)
		if err != nil {
			log.Error().Msg(err.Error())
			return nil
		}
		for _, node := range nodes {
			nodeIds = append(nodeIds, model.NodeIdentifier{NodeId: node.ID, NodeType: controls.ResourceTypeToString(controls.KubernetesCluster)})
		}
	case utils.NodeTypeCloudNode:
	}

	scanTrigger := model.ScanTriggerCommon{NodeIds: nodeIds, Filters: model.ScanFilter{}}

	switch messagePayload["action"].(string) {
	case utils.VULNERABILITY_SCAN:
		actionBuilder := func(scanId string, req model.NodeIdentifier, registryId int32) (ctl.Action, error) {
			registryIdStr := ""
			if registryId != -1 {
				registryIdStr = strconv.Itoa(int(registryId))
			}
			binArgs := map[string]string{"scan_id": scanId, "node_type": req.NodeType, "node_id": req.NodeId, "registry_id": registryIdStr, "scan_type": "all"}

			nodeTypeInternal := ctl.StringToResourceType(req.NodeType)

			if nodeTypeInternal == ctl.Image {
				name, tag, err := handler.GetImageFromId(ctx, req.NodeId)
				if err != nil {
					log.Error().Msgf("image not found %s", err.Error())
				} else {
					binArgs["image_name"] = name + ":" + tag
					log.Info().Msgf("node_id=%s image_name=%s", req.NodeId, binArgs["image_name"])
				}
			}

			internal_req := ctl.StartVulnerabilityScanRequest{NodeId: req.NodeId, NodeType: nodeTypeInternal, BinArgs: binArgs}

			b, err := json.Marshal(internal_req)
			if err != nil {
				return ctl.Action{}, err
			}

			return ctl.Action{ID: ctl.StartVulnerabilityScan, RequestPayload: string(b)}, nil
		}
		_, _, err := handler.StartMultiScan(ctx, false, utils.NEO4J_VULNERABILITY_SCAN, scanTrigger, actionBuilder)
		if err != nil {
			log.Error().Msg(err.Error())
			return nil
		}
	case utils.SECRET_SCAN:
		actionBuilder := func(scanId string, req model.NodeIdentifier, registryId int32) (ctl.Action, error) {
			registryIdStr := ""
			if registryId != -1 {
				registryIdStr = strconv.Itoa(int(registryId))
			}
			binArgs := map[string]string{"scan_id": scanId, "node_type": req.NodeType, "node_id": req.NodeId, "registry_id": registryIdStr}

			nodeTypeInternal := ctl.StringToResourceType(req.NodeType)

			if nodeTypeInternal == ctl.Image {
				name, tag, err := handler.GetImageFromId(ctx, req.NodeId)
				if err != nil {
					log.Error().Msgf("image not found %s", err.Error())
				} else {
					binArgs["image_name"] = name + ":" + tag
					log.Info().Msgf("node_id=%s image_name=%s", req.NodeId, binArgs["image_name"])
				}
			}

			internal_req := ctl.StartSecretScanRequest{NodeId: req.NodeId, NodeType: nodeTypeInternal, BinArgs: binArgs}

			b, err := json.Marshal(internal_req)
			if err != nil {
				return ctl.Action{}, err
			}

			return ctl.Action{ID: ctl.StartSecretScan, RequestPayload: string(b)}, nil
		}
		_, _, err := handler.StartMultiScan(ctx, false, utils.NEO4J_VULNERABILITY_SCAN, scanTrigger, actionBuilder)
		if err != nil {
			log.Error().Msg(err.Error())
			return nil
		}
	case utils.MALWARE_SCAN:
		actionBuilder := func(scanId string, req model.NodeIdentifier, registryId int32) (ctl.Action, error) {
			registryIdStr := ""
			if registryId != -1 {
				registryIdStr = strconv.Itoa(int(registryId))
			}
			binArgs := map[string]string{"scan_id": scanId, "node_type": req.NodeType, "node_id": req.NodeId, "registry_id": registryIdStr}

			nodeTypeInternal := ctl.StringToResourceType(req.NodeType)

			if nodeTypeInternal == ctl.Image {
				name, tag, err := handler.GetImageFromId(ctx, req.NodeId)
				if err != nil {
					log.Error().Msgf("image not found %s", err.Error())
				} else {
					binArgs["image_name"] = name + ":" + tag
					log.Info().Msgf("node_id=%s image_name=%s", req.NodeId, binArgs["image_name"])
				}
			}

			internal_req := ctl.StartMalwareScanRequest{NodeId: req.NodeId, NodeType: nodeTypeInternal, BinArgs: binArgs}

			b, err := json.Marshal(internal_req)
			if err != nil {
				return ctl.Action{}, err
			}

			return ctl.Action{ID: ctl.StartMalwareScan, RequestPayload: string(b)}, nil
		}
		_, _, err := handler.StartMultiScan(ctx, false, utils.NEO4J_VULNERABILITY_SCAN, scanTrigger, actionBuilder)
		if err != nil {
			log.Error().Msg(err.Error())
			return nil
		}
	case utils.COMPLIANCE_SCAN, utils.CLOUD_COMPLIANCE_SCAN:
		var err error
		if nodeType == controls.ResourceTypeToString(controls.CloudAccount) {
			_, _, err = handler.StartMultiCloudComplianceScan(ctx, nodeIds, []string{"cis"})
		} else if nodeType == controls.ResourceTypeToString(controls.KubernetesCluster) {
			_, _, err = handler.StartMultiCloudComplianceScan(ctx, nodeIds, []string{"nsa-cisa"})
		} else if nodeType == controls.ResourceTypeToString(controls.Host) {
			_, _, err = handler.StartMultiCloudComplianceScan(ctx, nodeIds, []string{"hipaa", "gdpr", "pci", "nist"})
		}
		if err != nil {
			log.Error().Msg(err.Error())
			return nil
		}
	}
	return nil
}
