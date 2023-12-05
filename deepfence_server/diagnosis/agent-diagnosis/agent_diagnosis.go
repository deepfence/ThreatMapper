package agent_diagnosis //nolint:stylecheck

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"path/filepath"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/diagnosis"
	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func verifyNodeIds(ctx context.Context, nodeIdentifiers []diagnosis.NodeIdentifier) (map[string]struct{}, error) {
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
	nodeIDs := make([]string, len(nodeIdentifiers))
	for i, n := range nodeIdentifiers {
		nodeIDs[i] = n.NodeID
	}
	res, err := tx.Run(`MATCH (n)
		WHERE (n:Node OR n:KubernetesCluster) AND n.node_id IN $node_ids
		OPTIONAL MATCH (n)<-[:SCHEDULEDLOGS]-(a:AgentDiagnosticLogs)
		WHERE NOT a.status = $complete AND NOT a.status = $failed
		RETURN n.node_id,a.status`,
		map[string]interface{}{"node_ids": nodeIDs,
			"complete": utils.ScanStatusSuccess,
			"failed":   utils.ScanStatusFailed})
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
			// return errors.New(fmt.Sprintf("Diagnostic logs already scheduled for node %v (status: %v)", rec[i].Values[0], rec[i].Values[1]))
		}
	}

	var missingNodes []string
	for _, nodeID := range nodeIDs {
		if !utils.InSlice(nodeID, foundNodeIds) {
			missingNodes = append(missingNodes, nodeID)
		}
	}
	if len(missingNodes) > 0 {
		return inProgressNodeIds, fmt.Errorf("could not find nodes %v", missingNodes)
	}
	return inProgressNodeIds, nil
}

func UpdateAgentDiagnosticLogsStatus(ctx context.Context, status diagnosis.DiagnosticLogsStatus) error {
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
	if err != nil {
		return err
	}
	defer tx.Close()

	_, err = tx.Run(`
		MATCH (n:AgentDiagnosticLogs{node_id:$node_id})
		SET n.status = $status, n.message = $message, n.updated_at = TIMESTAMP()`,
		map[string]interface{}{"node_id": status.NodeID, "status": status.Status, "message": status.Message})
	if err != nil {
		return err
	}
	return tx.Commit()
}

func GenerateAgentDiagnosticLogs(ctx context.Context, nodeIdentifiers []diagnosis.NodeIdentifier, tail string) error {
	inProgressNodeIds, err := verifyNodeIds(ctx, nodeIdentifiers)
	if err != nil {
		return err
	}
	mc, err := directory.MinioClient(ctx)
	if err != nil {
		return err
	}

	actionBuilder := func(nodeIdentifier diagnosis.NodeIdentifier, uploadUrl string, fileName string, tail string) (controls.Action, error) {
		req := controls.SendAgentDiagnosticLogsRequest{
			NodeID:    nodeIdentifier.NodeID,
			NodeType:  controls.StringToResourceType(nodeIdentifier.NodeType),
			UploadURL: uploadUrl,
			Tail:      tail,
			FileName:  fileName,
		}
		b, err := json.Marshal(req)
		if err != nil {
			return controls.Action{}, err
		}
		return controls.Action{
			ID:             controls.SendAgentDiagnosticLogs,
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
	if err != nil {
		return err
	}
	defer tx.Close()

	fileNameSuffix := "-" + time.Now().Format("2006-01-02-15-04-05") + ".zip"
	for _, nodeIdentifier := range nodeIdentifiers {
		if _, ok := inProgressNodeIds[nodeIdentifier.NodeID]; ok {
			continue
		}
		fileName := "deepfence-agent-logs-" + nodeIdentifier.NodeID + fileNameSuffix
		uploadURL, err := mc.CreatePublicUploadURL(ctx,
			filepath.Join(diagnosis.AgentDiagnosisFileServerPrefix, fileName), true, time.Minute*10, url.Values{})
		if err != nil {
			return err
		}
		action, err := actionBuilder(nodeIdentifier, uploadURL, fileName, tail)
		if err != nil {
			log.Error().Err(err)
			return err
		}
		b, err := json.Marshal(action)
		if err != nil {
			return err
		}
		if _, err = tx.Run(fmt.Sprintf(`
		MERGE (n:AgentDiagnosticLogs{node_id: $node_id})
		SET n.status=$status, n.retries=0, n.trigger_action=$action, n.updated_at=TIMESTAMP(), n.minio_file_name=$minio_file_name
		MERGE (m:%s{node_id:$node_id})
		MERGE (n)-[:SCHEDULEDLOGS]->(m)`, controls.ResourceTypeToNeo4j(controls.StringToResourceType(nodeIdentifier.NodeType))),
			map[string]interface{}{
				"status":          utils.ScanStatusStarting,
				"node_id":         nodeIdentifier.NodeID,
				"action":          string(b),
				"minio_file_name": fileName,
			}); err != nil {
			return err
		}
	}
	return tx.Commit()
}
