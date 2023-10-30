package cloudscanner_diagnosis

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/diagnosis"
	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func getInProgressCloudScannerNodeIds(ctx context.Context, nodeIdentifiers []diagnosis.NodeIdentifier) (map[string]struct{}, error) {
	inProgressNodeIds := map[string]struct{}{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return inProgressNodeIds, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return inProgressNodeIds, err
	}

	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return inProgressNodeIds, err
	}

	defer tx.Close()

	nodeIds := make([]string, len(nodeIdentifiers))
	for i, n := range nodeIdentifiers {
		nodeIds[i] = n.NodeId
	}

	res, err := tx.Run(`MATCH (n:CloudNode)
		WHERE n.node_id IN $node_ids
		OPTIONAL MATCH (n)<-[:SCHEDULEDLOGS]-(a:CloudScannerDiagnosticLogs)
		WHERE NOT a.status = $complete AND NOT a.status = $failed
		RETURN n.node_id,a.status`,
		map[string]interface{}{
			"node_ids": nodeIds,
			"complete": utils.SCAN_STATUS_SUCCESS,
			"failed":   utils.SCAN_STATUS_FAILED})
	if err != nil {
		return inProgressNodeIds, err
	}

	rec, err := res.Collect()
	if err != nil {
		return inProgressNodeIds, err
	}

	var foundNodeIds []string
	for i := range rec {
		foundNodeIds = append(foundNodeIds, rec[i].Values[0].(string))
		if rec[i].Values[1] != nil {
			inProgressNodeIds[rec[i].Values[0].(string)] = struct{}{}
		}
	}

	var missingNodes []string
	for _, nodeId := range nodeIds {
		if !utils.InSlice(nodeId, foundNodeIds) {
			missingNodes = append(missingNodes, nodeId)
		}
	}

	if len(missingNodes) > 0 {
		return inProgressNodeIds, errors.New(fmt.Sprintf("could not find nodes %v", missingNodes))
	}

	return inProgressNodeIds, nil
}

func UpdateCloudScannerDiagnosticLogsStatus(ctx context.Context, status diagnosis.DiagnosticLogsStatus) error {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close()
	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	defer tx.Close()

	_, err = tx.Run(`
		MATCH (n:CloudScannerDiagnosticLogs{node_id:$node_id})
		SET n.status = $status, n.message = $message, n.updated_at = TIMESTAMP()`,
		map[string]interface{}{"node_id": status.NodeID, "status": status.Status, "message": status.Message})
	if err != nil {
		return err
	}
	return tx.Commit()
}

func GenerateCloudScannerDiagnosticLogs(ctx context.Context, nodeIdentifiers []diagnosis.NodeIdentifier, tail string) error {
	inProgressNodeIds, err := getInProgressCloudScannerNodeIds(ctx, nodeIdentifiers)
	if err != nil {
		return err
	}
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		return err
	}

	actionBuilder := func(nodeIdentifier diagnosis.NodeIdentifier, uploadUrl string, fileName string, tail string) (ctl.Action, error) {
		req := ctl.SendAgentDiagnosticLogsRequest{
			NodeId:    nodeIdentifier.NodeId,
			NodeType:  ctl.StringToResourceType(nodeIdentifier.NodeType),
			UploadURL: uploadUrl,
			Tail:      tail,
			FileName:  fileName,
		}
		b, err := json.Marshal(req)
		if err != nil {
			return ctl.Action{}, err
		}
		return ctl.Action{
			ID:             ctl.SendAgentDiagnosticLogs,
			RequestPayload: string(b),
		}, nil
	}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close()
	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	defer tx.Close()

	fileNameSuffix := "-" + time.Now().Format("2006-01-02-15-04-05") + ".zip"
	for _, nodeIdentifier := range nodeIdentifiers {
		if _, ok := inProgressNodeIds[nodeIdentifier.NodeId]; ok {
			continue
		}
		fileName := "deepfence-cloudscanner-logs-" + nodeIdentifier.NodeId + fileNameSuffix
		uploadUrl, err := mc.CreatePublicUploadURL(ctx, diagnosis.CloudScannerDiagnosticLogsPrefix+fileName, true, time.Minute*10, url.Values{})
		if err != nil {
			return err
		}
		action, err := actionBuilder(nodeIdentifier, uploadUrl, fileName, tail)
		if err != nil {
			log.Error().Err(err)
			return err
		}
		b, err := json.Marshal(action)
		if err != nil {
			return err
		}
		if _, err = tx.Run(fmt.Sprintf(`
		MERGE (n:CloudScannerDiagnosticLogs{node_id: $node_id})
		SET n.status=$status, n.retries=0, n.trigger_action=$action, n.updated_at=TIMESTAMP(), n.minio_file_name=$minio_file_name
		MERGE (m:%s{node_id:$node_id})
		MERGE (n)-[:SCHEDULEDLOGS]->(m)`, controls.ResourceTypeToNeo4j(controls.StringToResourceType(nodeIdentifier.NodeType))),
			map[string]interface{}{
				"status":          utils.SCAN_STATUS_STARTING,
				"node_id":         nodeIdentifier.NodeId,
				"action":          string(b),
				"minio_file_name": fileName,
			}); err != nil {
			return err
		}
	}
	return tx.Commit()

}

func GetQueuedCloudScannerDiagnosticLogs(ctx context.Context, nodeIDs []string) (ctl.Action, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return ctl.Action{}, err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return ctl.Action{}, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	defer tx.Close()

	res, err := tx.Run(`MATCH (n:CloudScannerDiagnosticLogs)
		WHERE n.status = $status and n.node_id in $node_ids
		RETURN n.trigger_action
		ORDER BY n.updated_at ASC LIMIT 1`,
		map[string]interface{}{"status": utils.SCAN_STATUS_STARTING, "node_ids": nodeIDs})

	if err != nil {
		return ctl.Action{}, err
	}

	rec, err := res.Collect()
	if err != nil {
		return ctl.Action{}, err
	}

	if len(rec) == 0 {
		return ctl.Action{}, nil
	}

	var action ctl.Action
	if err := json.Unmarshal([]byte(rec[0].Values[0].(string)), &action); err != nil {
		return ctl.Action{}, err
	}

	return action, nil

}
