package ingesters

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type AlreadyRunningScanError struct {
	ScanId   string
	ScanType string
	NodeId   string
}

func (ve *AlreadyRunningScanError) Error() string {
	return fmt.Sprintf("Scan of type %s already running for %s, id: %s", ve.ScanType, ve.NodeId, ve.ScanId)
}

type AgentNotInstalledError struct {
	NodeId string
}

func (ve *AgentNotInstalledError) Error() string {
	return fmt.Sprintf("Agent sensor not installed in %s", ve.NodeId)
}

type NodeNotFoundError struct {
	NodeId string
}

func (ve *NodeNotFoundError) Error() string {
	return fmt.Sprintf("Node %v not found", ve.NodeId)
}

type NodeNotActiveError struct {
	NodeId string
}

func (ve *NodeNotActiveError) Error() string {
	return fmt.Sprintf("Node %v is currently not active", ve.NodeId)
}

type WriteDBTransaction struct {
	Tx neo4j.Transaction
}

func (t WriteDBTransaction) Run(cypher string, params map[string]interface{}) (neo4j.Result, error) {
	return t.Tx.Run(cypher, params)
}

func AddNewScan(tx WriteDBTransaction,
	scan_type utils.Neo4jScanType,
	scan_id string,
	node_type controls.ScanResource,
	node_id string,
	action controls.Action) error {

	res, err := tx.Run(fmt.Sprintf(`
		OPTIONAL MATCH (n:%s{node_id:$node_id})
		RETURN n IS NOT NULL AS Exists`,
		controls.ResourceTypeToNeo4j(node_type)),
		map[string]interface{}{
			"node_id": node_id,
		})
	if err != nil {
		return err
	}

	rec, err := res.Single()
	if err != nil {
		return err
	}

	if !rec.Values[0].(bool) {
		return &NodeNotFoundError{
			NodeId: node_id,
		}
	}

	res, err = tx.Run(fmt.Sprintf(`
		MATCH (m:%s{node_id:$node_id})
		OPTIONAL MATCH (n:%s)-[:SCANNED]->(m)
		WHERE NOT n.status = $complete
		AND NOT n.status = $failed
		AND not n.status = $cancelled
		RETURN n.node_id, m.agent_running`, controls.ResourceTypeToNeo4j(node_type), scan_type),
		map[string]interface{}{
			"node_id":   node_id,
			"complete":  utils.SCAN_STATUS_SUCCESS,
			"failed":    utils.SCAN_STATUS_FAILED,
			"cancelled": utils.SCAN_STATUS_CANCELLED})
	if err != nil {
		return err
	}

	rec, err = res.Single()
	if err != nil {
		return err
	}

	if rec.Values[0] != nil {
		return &AlreadyRunningScanError{
			ScanId:   rec.Values[0].(string),
			NodeId:   node_id,
			ScanType: string(scan_type),
		}
	}
	if rec.Values[1] != nil {
		if !rec.Values[1].(bool) {
			return &AgentNotInstalledError{
				NodeId: node_id,
			}
		}
	}

	b, err := json.Marshal(action)
	if err != nil {
		return err
	}

	if _, err = tx.Run(fmt.Sprintf(`
		MERGE (n:%s{node_id: $scan_id, status: $status, status_message: "", retries: 0, trigger_action: $action, updated_at: TIMESTAMP(), created_at: TIMESTAMP()})
		MERGE (m:%s{node_id:$node_id})
		MERGE (n)-[:SCANNED]->(m)`, scan_type, controls.ResourceTypeToNeo4j(node_type)),
		map[string]interface{}{
			"scan_id": scan_id,
			"status":  utils.SCAN_STATUS_STARTING,
			"node_id": node_id,
			"action":  string(b)}); err != nil {
		return err
	}

	latestScanIDFieldName := ingestersUtil.LatestScanIdField[scan_type]
	scanStatusFieldName := ingestersUtil.ScanStatusField[scan_type]

	if _, err = tx.Run(fmt.Sprintf(`
		MERGE (n:%s{node_id: $scan_id})
		SET n.status = $status, n.updated_at = TIMESTAMP()
		WITH n
		OPTIONAL MATCH (n) -[:DETECTED]- (m)
		WITH n
		MATCH (n) -[:SCANNED]- (r)
		SET r.%s=n.status, r.%s=n.node_id`,
		scan_type, scanStatusFieldName, latestScanIDFieldName),
		map[string]interface{}{
			"scan_id": scan_id,
			"status":  utils.SCAN_STATUS_STARTING}); err != nil {
		return err
	}

	switch node_type {
	case controls.Host:
		if _, err = tx.Run(fmt.Sprintf(`
		MATCH (n:%s{node_id: $scan_id})
		MATCH (m:Node{node_id:$node_id})
		MERGE (n)-[:SCHEDULED]->(m)`, scan_type),
			map[string]interface{}{
				"scan_id": scan_id,
				"node_id": node_id,
			}); err != nil {
			return err
		}
	case controls.Container:
		if _, err = tx.Run(fmt.Sprintf(`
		MATCH (n:%s{node_id: $scan_id})
		MATCH (m:Node) -[:HOSTS]-> (:Container{node_id:$node_id})
		MERGE (n)-[:SCHEDULED]->(m)`, scan_type),
			map[string]interface{}{
				"scan_id": scan_id,
				"node_id": node_id,
			}); err != nil {
			return err
		}

		podQuery := `MATCH (n:Pod) 
			CALL { 
				MATCH (c:Container) 
				WHERE c.node_id=$node_id 
				RETURN c.pod_id AS pod_id
			}
			WITH n
			WHERE pod_id IS NOT NULL AND n.node_id=pod_id
			SET n.%s=$status`

		if _, err = tx.Run(fmt.Sprintf(podQuery, scanStatusFieldName),
			map[string]interface{}{
				"node_id": node_id,
				"status":  utils.SCAN_STATUS_STARTING}); err != nil {
			return err
		}
	case controls.Image:
		if _, err = tx.Run(fmt.Sprintf(`
		MATCH (n:%s{node_id: $scan_id})
		OPTIONAL MATCH (m:Node) -[:HOSTS]-> (:ContainerImage{node_id:$node_id})
		WITH n, m
		ORDER BY rand()
		LIMIT 1
		MATCH (l:Node{node_id: "deepfence-console-cron"})
		WITH coalesce(m, l) as exec, n
		MERGE (n)-[:SCHEDULED]->(exec)`, scan_type),
			map[string]interface{}{
				"scan_id": scan_id,
				"node_id": node_id,
			}); err != nil {
			return err
		}
	}
	return nil
}

func AddNewCloudComplianceScan(tx WriteDBTransaction,
	scanId string,
	benchmarkTypes []string,
	nodeId string,
	nodeType string) error {

	neo4jNodeType := "CloudNode"
	scanType := utils.NEO4J_CLOUD_COMPLIANCE_SCAN
	if nodeType == controls.ResourceTypeToString(controls.KubernetesCluster) {
		neo4jNodeType = "KubernetesCluster"
		scanType = utils.NEO4J_COMPLIANCE_SCAN
	} else if nodeType == controls.ResourceTypeToString(controls.Host) {
		neo4jNodeType = "Node"
		scanType = utils.NEO4J_COMPLIANCE_SCAN
	}
	res, err := tx.Run(fmt.Sprintf(`
		OPTIONAL MATCH (n:%s{node_id:$node_id})
		RETURN n IS NOT NULL AS Exists, n.active`, neo4jNodeType),
		map[string]interface{}{
			"node_id": nodeId,
		})
	if err != nil {
		return err
	}

	rec, err := res.Single()
	if err != nil {
		return err
	}

	if !rec.Values[0].(bool) {
		return &NodeNotFoundError{
			NodeId: nodeId,
		}
	}

	if !rec.Values[1].(bool) {
		return &NodeNotActiveError{
			NodeId: nodeId,
		}
	}

	res, err = tx.Run(fmt.Sprintf(`
		MATCH (m:%s{node_id:$node_id})
		OPTIONAL MATCH (n:%s)-[:SCANNED]->(m)
		WHERE NOT n.status = $complete
		AND NOT n.status = $failed
		AND NOT n.status = $cancelled
		AND n.benchmark_types = $benchmark_types
		RETURN n.node_id, m.agent_running`, neo4jNodeType, scanType),
		map[string]interface{}{
			"node_id":         nodeId,
			"complete":        utils.SCAN_STATUS_SUCCESS,
			"failed":          utils.SCAN_STATUS_FAILED,
			"cancelled":       utils.SCAN_STATUS_CANCELLED,
			"benchmark_types": benchmarkTypes,
		})
	if err != nil {
		return err
	}

	rec, err = res.Single()
	if err != nil {
		return err
	}

	if rec.Values[0] != nil {
		return &AlreadyRunningScanError{
			ScanId:   rec.Values[0].(string),
			NodeId:   nodeId,
			ScanType: string(scanType),
		}
	}
	if rec.Values[1] != nil {
		if !rec.Values[1].(bool) {
			return &AgentNotInstalledError{
				NodeId: nodeId,
			}
		}
	}
	nt := ctl.KubernetesCluster
	if nodeType == controls.ResourceTypeToString(controls.Host) {
		nt = ctl.Host
	}
	internalReq, _ := json.Marshal(ctl.StartComplianceScanRequest{
		NodeId:   nodeId,
		NodeType: nt,
		BinArgs:  map[string]string{"scan_id": scanId, "benchmark_types": strings.Join(benchmarkTypes, ",")},
	})
	action, _ := json.Marshal("{}")
	if nodeType == controls.ResourceTypeToString(controls.KubernetesCluster) || nodeType == controls.ResourceTypeToString(controls.Host) {
		action, _ = json.Marshal(ctl.Action{ID: ctl.StartComplianceScan, RequestPayload: string(internalReq)})
	}
	if _, err = tx.Run(fmt.Sprintf(`
		MERGE (n:%s{node_id: $scan_id, status: $status, status_message: "", retries: 0, updated_at: TIMESTAMP(), benchmark_types: $benchmark_types, trigger_action: $action, created_at:TIMESTAMP()})
		MERGE (m:%s{node_id:$node_id})
		MERGE (n)-[:SCANNED]->(m)`, scanType, neo4jNodeType),
		map[string]interface{}{
			"scan_id":         scanId,
			"status":          utils.SCAN_STATUS_STARTING,
			"node_id":         nodeId,
			"benchmark_types": benchmarkTypes,
			"action":          string(action),
		}); err != nil {
		return err
	}

	latestScanIDFieldName := ingestersUtil.LatestScanIdField[scanType]
	scanStatusFieldName := ingestersUtil.ScanStatusField[scanType]

	if _, err = tx.Run(fmt.Sprintf(`
		MERGE (n:%s{node_id: $scan_id})
		SET n.status = $status, n.updated_at = TIMESTAMP()
		WITH n
		OPTIONAL MATCH (n) -[:DETECTED]- (m)
		WITH n
		MATCH (n) -[:SCANNED]- (r)
		SET r.%s=n.status, r.%s=n.node_id`,
		scanType, scanStatusFieldName, latestScanIDFieldName),
		map[string]interface{}{
			"scan_id": scanId,
			"status":  utils.SCAN_STATUS_STARTING}); err != nil {
		return err
	}

	if _, err = tx.Run(fmt.Sprintf(`
		MATCH (n:%s{node_id: $scan_id})
		MATCH (m:%s{node_id:$node_id})
		MERGE (n)-[:SCHEDULED]->(m)`, scanType, neo4jNodeType),
		map[string]interface{}{
			"scan_id": scanId,
			"node_id": nodeId,
		}); err != nil {
		return err
	}

	return nil
}

func UpdateScanStatus(ctx context.Context, scan_type string, scan_id string, status, message string) error {

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

	if _, err = tx.Run(fmt.Sprintf(`
		MERGE (n:%s{node_id: $scan_id})
		SET n.status = $status, n.status_message = $message, n.updated_at = TIMESTAMP()`, scan_type),
		map[string]interface{}{
			"scan_id": scan_id,
			"message": message,
			"status":  status}); err != nil {
		return err
	}

	return tx.Commit()
}

func AddBulkScan(tx WriteDBTransaction, scan_type utils.Neo4jScanType, bulk_scan_id string, scan_ids []string) error {

	if _, err := tx.Run(fmt.Sprintf(`
		MERGE (n:Bulk%s{node_id: $bscan_id})
		SET n.updated_at = TIMESTAMP()
		WITH n
		MATCH (m:%s)
		WHERE m.node_id IN $scan_ids
		MERGE (n) -[:BATCH]-> (m)`, scan_type, scan_type),
		map[string]interface{}{
			"bscan_id": bulk_scan_id,
			"scan_ids": scan_ids}); err != nil {
		return err
	}

	return nil
}
