package ingesters

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type AlreadyRunningScanError struct {
	ScanID   string
	ScanType string
	nodeID   string
}

func (ve *AlreadyRunningScanError) Error() string {
	return fmt.Sprintf("Scan of type %s already running for %s, id: %s", ve.ScanType, ve.nodeID, ve.ScanID)
}

type DeepfenceSystemScanError struct {
	NodeID string
}

func (ve *DeepfenceSystemScanError) Error() string {
	return fmt.Sprintf("deepfence_system_scan=true required to scan Deepfence image/pod/container: %s", ve.NodeID)
}

type AgentNotInstalledError struct {
	nodeID string
}

func (ve *AgentNotInstalledError) Error() string {
	return fmt.Sprintf("Agent sensor not installed in %s", ve.nodeID)
}

type NodeNotFoundError struct {
	NodeID string
}

func (ve *NodeNotFoundError) Error() string {
	return fmt.Sprintf("Node %v not found", ve.NodeID)
}

type NodeNotActiveError struct {
	NodeID string
}

func (ve *NodeNotActiveError) Error() string {
	return fmt.Sprintf("Node %v is currently not active", ve.NodeID)
}

func AddNewScan(ctx context.Context,
	tx neo4j.ExplicitTransaction,
	scanType utils.Neo4jScanType,
	scanID string,
	nodeType controls.ScanResource,
	nodeID string,
	isPriority bool,
	action controls.Action,
	deepfenceSystemScan bool) error {

	ctx, span := telemetry.NewSpan(ctx, "ingesters", "add-new-scan")
	defer span.End()

	res, err := tx.Run(ctx, fmt.Sprintf(`
		OPTIONAL MATCH (n:%s{node_id:$node_id})
		RETURN n IS NOT NULL AS Exists, n.is_deepfence_system`,
		controls.ResourceTypeToNeo4j(nodeType)),
		map[string]interface{}{
			"node_id": nodeID,
		})
	if err != nil {
		return err
	}

	rec, err := res.Single(ctx)
	if err != nil {
		return err
	}

	if !rec.Values[0].(bool) {
		return &NodeNotFoundError{
			NodeID: nodeID,
		}
	}
	if !deepfenceSystemScan && rec.Values[1] != nil && rec.Values[1].(bool) {
		return &DeepfenceSystemScanError{
			NodeID: nodeID,
		}
	}

	res, err = tx.Run(ctx, fmt.Sprintf(`
		MATCH (m:%s{node_id:$node_id}) <-[:SCANNED]- (n:%s)
		WHERE NOT n.status IN $status
		RETURN n.node_id`, controls.ResourceTypeToNeo4j(nodeType), scanType),
		map[string]interface{}{
			"node_id": nodeID,
			"status":  []string{utils.ScanStatusSuccess, utils.ScanStatusFailed, utils.ScanStatusCancelled},
		})

	if err != nil {
		return err
	}

	rec, err = res.Single(ctx)
	if err == nil {
		if rec.Values[0] != nil {
			return &AlreadyRunningScanError{
				ScanID:   rec.Values[0].(string),
				nodeID:   nodeID,
				ScanType: string(scanType),
			}
		}
	}

	if nodeType == controls.Host || nodeType == controls.KubernetesCluster {
		res, err = tx.Run(ctx, fmt.Sprintf(`
			MATCH (m:%s{node_id:$node_id})
			RETURN m.agent_running`, controls.ResourceTypeToNeo4j(nodeType)),
			map[string]interface{}{
				"node_id": nodeID,
				"status":  []string{utils.ScanStatusSuccess, utils.ScanStatusFailed, utils.ScanStatusCancelled},
			})
		if err != nil {
			return err
		}

		rec, err = res.Single(ctx)
		if err != nil {
			return err
		}
		if rec.Values[0] != nil {
			if !rec.Values[0].(bool) {
				return &AgentNotInstalledError{
					nodeID: nodeID,
				}
			}
		}
	}

	b, err := json.Marshal(action)
	if err != nil {
		return err
	}

	if _, err = tx.Run(ctx, fmt.Sprintf(`
		MERGE (n:%s{node_id:$scan_id})
		MERGE (m:%s{node_id:$node_id})
		MERGE (n)-[:SCANNED]->(m)
		SET n.status = $status,
			n.status_message = "",
			n.retries = 0,
			n.trigger_action = $action,
			n.updated_at = TIMESTAMP(),
			n.created_at = TIMESTAMP(),
			n.is_priority =  $is_priority,
			m.%s = $status,
			m.%s = $scan_id
		`,
		scanType,
		controls.ResourceTypeToNeo4j(nodeType),
		ingestersUtil.ScanStatusField[scanType],
		ingestersUtil.LatestScanIDField[scanType]),
		map[string]interface{}{
			"scan_id":     scanID,
			"status":      utils.ScanStatusStarting,
			"node_id":     nodeID,
			"action":      string(b),
			"is_priority": isPriority}); err != nil {
		return err
	}

	switch nodeType {
	case controls.Host:
		if _, err = tx.Run(ctx, fmt.Sprintf(`
		MATCH (n:%s{node_id: $scan_id})
		MATCH (m:Node{node_id:$node_id})
		MERGE (n)-[:SCHEDULED]->(m)`, scanType),
			map[string]interface{}{
				"scan_id": scanID,
				"node_id": nodeID,
			}); err != nil {
			return err
		}
	case controls.Container:
		if _, err = tx.Run(ctx, fmt.Sprintf(`
		MATCH (n:%s{node_id: $scan_id})
		MATCH (m:Node) -[:HOSTS]-> (:Container{node_id:$node_id})
		MERGE (n)-[:SCHEDULED]->(m)`, scanType),
			map[string]interface{}{
				"scan_id": scanID,
				"node_id": nodeID,
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

		if _, err = tx.Run(ctx, fmt.Sprintf(podQuery, ingestersUtil.ScanStatusField[scanType]),
			map[string]interface{}{
				"node_id": nodeID,
				"status":  utils.ScanStatusStarting}); err != nil {
			return err
		}
	case controls.Image:
		if _, err = tx.Run(ctx, fmt.Sprintf(`
		MATCH (n:%s{node_id: $scan_id})
		OPTIONAL MATCH (m:Node) -[:HOSTS]-> (:ContainerImage{node_id:$node_id})
		WITH n, m
		ORDER BY rand()
		LIMIT 1
		MATCH (l:Node{node_id: "deepfence-console-cron"})
		WITH coalesce(m, l) as exec, n
		MERGE (n)-[:SCHEDULED]->(exec)`, scanType),
			map[string]interface{}{
				"scan_id": scanID,
				"node_id": nodeID,
			}); err != nil {
			return err
		}
	}
	return nil
}

func AddNewCloudComplianceScan(
	ctx context.Context,
	tx neo4j.ExplicitTransaction,
	scanID string,
	benchmarkTypes []string,
	nodeID string,
	nodeType string,
	isPriority bool) error {

	ctx, span := telemetry.NewSpan(ctx, "ingesters", "add-new-cloud-compliance-scan")
	defer span.End()

	neo4jNodeType := "CloudNode"
	scanType := utils.NEO4JCloudComplianceScan
	if nodeType == controls.ResourceTypeToString(controls.KubernetesCluster) {
		neo4jNodeType = "KubernetesCluster"
		scanType = utils.NEO4JComplianceScan
	} else if nodeType == controls.ResourceTypeToString(controls.Host) {
		neo4jNodeType = "Node"
		scanType = utils.NEO4JComplianceScan
	}
	res, err := tx.Run(ctx, fmt.Sprintf(`
		OPTIONAL MATCH (n:%s{node_id:$node_id})
		RETURN n IS NOT NULL AS Exists, n.active`, neo4jNodeType),
		map[string]interface{}{
			"node_id": nodeID,
		})
	if err != nil {
		return err
	}

	rec, err := res.Single(ctx)
	if err != nil {
		return err
	}

	if !rec.Values[0].(bool) {
		return &NodeNotFoundError{
			NodeID: nodeID,
		}
	}

	if !rec.Values[1].(bool) {
		return &NodeNotActiveError{
			NodeID: nodeID,
		}
	}

	res, err = tx.Run(ctx, fmt.Sprintf(`
		MATCH (m:%s{node_id:$node_id})
		OPTIONAL MATCH (n:%s)-[:SCANNED]->(m)
		WHERE NOT n.status = $complete
		AND NOT n.status = $failed
		AND NOT n.status = $cancelled
		AND n.benchmark_types = $benchmark_types
		RETURN n.node_id, m.agent_running`, neo4jNodeType, scanType),
		map[string]interface{}{
			"node_id":         nodeID,
			"complete":        utils.ScanStatusSuccess,
			"failed":          utils.ScanStatusFailed,
			"cancelled":       utils.ScanStatusCancelled,
			"benchmark_types": benchmarkTypes,
		})
	if err != nil {
		return err
	}

	rec, err = res.Single(ctx)
	if err != nil {
		return err
	}

	if rec.Values[0] != nil {
		return &AlreadyRunningScanError{
			ScanID:   rec.Values[0].(string),
			nodeID:   nodeID,
			ScanType: string(scanType),
		}
	}
	if rec.Values[1] != nil {
		if !rec.Values[1].(bool) {
			return &AgentNotInstalledError{
				nodeID: nodeID,
			}
		}
	}
	nt := controls.KubernetesCluster
	if nodeType == controls.ResourceTypeToString(controls.Host) {
		nt = controls.Host
	}
	var action []byte
	var hostNodeId, hostNeo4jNodeType string

	if nodeType == controls.ResourceTypeToString(controls.KubernetesCluster) || nodeType == controls.ResourceTypeToString(controls.Host) {
		hostNodeId = nodeID
		hostNeo4jNodeType = neo4jNodeType
		internalReq, _ := json.Marshal(controls.StartComplianceScanRequest{
			NodeID:   nodeID,
			NodeType: nt,
			BinArgs: map[string]string{"scan_id": scanID,
				"benchmark_types": strings.Join(benchmarkTypes, ",")},
		})
		action, _ = json.Marshal(controls.Action{ID: controls.StartComplianceScan,
			RequestPayload: string(internalReq)})
	} else { // if nodeType == controls.ResourceTypeToString(controls.CloudAccount)
		hostNeo4jNodeType = "Node"
		res, err = tx.Run(ctx,
			fmt.Sprintf(`MATCH (n:%s) -[:HOSTS]-> (m:%s{node_id: $node_id})
			WHERE n.active=true
			RETURN  n.node_id, m.cloud_provider, m.node_name`, hostNeo4jNodeType, neo4jNodeType),
			map[string]interface{}{
				"node_id": nodeID,
			})
		if err != nil {
			log.Error().Msgf(err.Error())
			return err
		}
		rec, err = res.Single(ctx)
		if err != nil {
			log.Error().Msgf(err.Error())
			return err
		}
		scanNodeDetails := controls.CloudScanNodeDetails{
			AgentNodeId:   rec.Values[0].(string),
			CloudProvider: rec.Values[1].(string),
			NodeName:      rec.Values[2].(string),
		}
		hostNodeId = scanNodeDetails.AgentNodeId
		benchmarks, err := GetActiveCloudControls(ctx, tx, benchmarkTypes, scanNodeDetails.CloudProvider)
		if err != nil {
			log.Error().Msgf("Error getting controls for compliance type: %+v", benchmarkTypes)
		}

		internalReq, _ := json.Marshal(controls.StartCloudComplianceScanRequest{
			NodeID:   nodeID,
			NodeType: nt,
			BinArgs:  map[string]string{"scan_id": scanID, "benchmark_types": strings.Join(benchmarkTypes, ",")},
			ScanDetails: controls.CloudComplianceScanDetails{
				ScanId:     scanID,
				ScanTypes:  benchmarkTypes,
				AccountId:  scanNodeDetails.NodeName,
				Benchmarks: benchmarks,
			},
		})
		action, _ = json.Marshal(controls.Action{ID: controls.StartCloudComplianceScan, RequestPayload: string(internalReq)})
	}

	if _, err = tx.Run(ctx, fmt.Sprintf(`
		MERGE (n:%s{node_id: $scan_id, status: $status, status_message: "", retries: 0, updated_at: TIMESTAMP(), benchmark_types: $benchmark_types, trigger_action: $action, created_at:TIMESTAMP(), is_priority: $is_priority})
		MERGE (m:%s{node_id:$node_id})
		MERGE (n)-[:SCANNED]->(m)`, scanType, neo4jNodeType),
		map[string]interface{}{
			"scan_id":         scanID,
			"status":          utils.ScanStatusStarting,
			"node_id":         nodeID,
			"benchmark_types": benchmarkTypes,
			"action":          string(action),
			"is_priority":     isPriority,
		}); err != nil {
		log.Error().Msgf(err.Error())
		return err
	}

	latestScanIDFieldName := ingestersUtil.LatestScanIDField[scanType]
	scanStatusFieldName := ingestersUtil.ScanStatusField[scanType]

	if _, err = tx.Run(ctx, fmt.Sprintf(`
		MERGE (n:%s{node_id: $scan_id})
		SET n.status = $status, n.updated_at = TIMESTAMP()
		WITH n
		OPTIONAL MATCH (n) -[:DETECTED]- (m)
		WITH n
		MATCH (n) -[:SCANNED]- (r)
		SET r.%s=n.status, r.%s=n.node_id`,
		scanType, scanStatusFieldName, latestScanIDFieldName),
		map[string]interface{}{
			"scan_id": scanID,
			"status":  utils.ScanStatusStarting}); err != nil {
		return err
	}

	if _, err = tx.Run(ctx, fmt.Sprintf(`
		MATCH (n:%s{node_id: $scan_id})
		MATCH (m:%s{node_id:$node_id})
		MERGE (n)-[:SCHEDULED]->(m)`, scanType, "Node"),
		map[string]interface{}{
			"scan_id": scanID,
			"node_id": hostNodeId,
		}); err != nil {
		return err
	}

	return nil
}

func UpdateScanStatus(ctx context.Context, scanType string, scanID string, status, message string) error {

	ctx, span := telemetry.NewSpan(ctx, "ingesters", "update-scan-status")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)

	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	if _, err = tx.Run(ctx, fmt.Sprintf(`
		MERGE (n:%s{node_id: $scan_id})
		SET n.status = $status, n.status_message = $message, n.updated_at = TIMESTAMP()`, scanType),
		map[string]interface{}{
			"scan_id": scanID,
			"message": message,
			"status":  status}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func AddBulkScan(ctx context.Context, tx neo4j.ExplicitTransaction, scanType utils.Neo4jScanType, bulkScanID string, scanIDs []string) error {

	ctx, span := telemetry.NewSpan(ctx, "ingesters", "add-bulk-scan")
	defer span.End()

	if _, err := tx.Run(ctx, fmt.Sprintf(`
		MERGE (n:Bulk%s{node_id: $bscan_id})
		SET n.updated_at = TIMESTAMP()
		WITH n
		MATCH (m:%s)
		WHERE m.node_id IN $scan_ids
		MERGE (n) -[:BATCH]-> (m)`, scanType, scanType),
		map[string]interface{}{
			"bscan_id": bulkScanID,
			"scan_ids": scanIDs}); err != nil {
		return err
	}

	return nil
}

func GetActiveCloudControls(ctx context.Context, tx neo4j.ExplicitTransaction, complianceTypes []string,
	cloudProvider string) ([]controls.CloudComplianceScanBenchmark, error) {
	var benchmarks []controls.CloudComplianceScanBenchmark
	res, err := tx.Run(ctx, `
		MATCH (n:CloudComplianceBenchmark) -[:PARENT]-> (m:CloudComplianceControl)
		WHERE m.active = true
		AND m.disabled = false
		AND m.compliance_type IN $compliance_types
		AND n.cloud_provider = $cloud_provider
		RETURN  n.benchmark_id, n.compliance_type, collect(m.control_id)
		ORDER BY n.compliance_type`,
		map[string]interface{}{
			"cloud_provider":   cloudProvider,
			"compliance_types": complianceTypes,
		})
	if err != nil {
		return benchmarks, err
	}

	recs, err := res.Collect(ctx)
	if err != nil {
		return benchmarks, err
	}

	for _, rec := range recs {
		var controlList []string
		for _, rVal := range rec.Values[2].([]interface{}) {
			controlList = append(controlList, rVal.(string))
		}
		benchmark := controls.CloudComplianceScanBenchmark{
			Id:             rec.Values[0].(string),
			ComplianceType: rec.Values[1].(string),
			Controls:       controlList,
		}
		benchmarks = append(benchmarks, benchmark)
	}

	return benchmarks, nil
}
