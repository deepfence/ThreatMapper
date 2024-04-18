package reporters_scan //nolint:stylecheck

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/db"
	"github.com/samber/mo"
)

type NodeNotFoundError struct {
	nodeID string
}

func (ve *NodeNotFoundError) Error() string {
	return fmt.Sprintf("Node %v not found", ve.nodeID)
}

func GetScanStatus(ctx context.Context, scanType utils.Neo4jScanType, scanIDs []string) (model.ScanStatusResp, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return model.ScanStatusResp{}, err
	}
	defer tx.Close(ctx)

	r, err := tx.Run(ctx, fmt.Sprintf(`
		OPTIONAL MATCH (n:%s)
		WHERE n.node_id IN $node_ids
		RETURN COUNT(n) <> 0 AS Exists`,
		scanType),
		map[string]interface{}{
			"node_ids": scanIDs,
		})
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	recc, err := r.Single(ctx)
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	if !recc.Values[0].(bool) {
		return model.ScanStatusResp{},
			&NodeNotFoundError{
				nodeID: "unknown",
			}
	}

	res, err := tx.Run(ctx, fmt.Sprintf(`
		MATCH (m:%s) -[:SCANNED]-> (n)
		WHERE m.node_id IN $scan_ids
		RETURN m.node_id, m.status, m.status_message, n.node_id, n.node_name, labels(n) as node_type, m.created_at, m.updated_at`, scanType),
		map[string]interface{}{"scan_ids": scanIDs})
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	recs, err := res.Collect(ctx)
	if err != nil {
		return model.ScanStatusResp{}, reporters.ErrNotFound
	}

	return model.ScanStatusResp{Statuses: extractStatuses(recs)}, nil
}

func extractStatuses(recs []*db.Record) map[string]model.ScanInfo {
	statuses := map[string]model.ScanInfo{}
	for _, rec := range recs {
		info := model.ScanInfo{
			ScanID:        rec.Values[0].(string),
			Status:        rec.Values[1].(string),
			StatusMessage: rec.Values[2].(string),
			NodeID:        rec.Values[3].(string),
			NodeName:      rec.Values[4].(string),
			NodeType:      Labels2NodeType(rec.Values[5].([]interface{})),
			CreatedAt:     rec.Values[6].(int64),
			UpdatedAt:     rec.Values[7].(int64),
		}
		statuses[rec.Values[0].(string)] = info
	}
	return statuses
}

func GetComplianceScanStatus(ctx context.Context, scanType utils.Neo4jScanType, scanIDs []string) (model.ComplianceScanStatusResp, error) {
	scanResponse := model.ComplianceScanStatusResp{
		Statuses: []model.ComplianceScanInfo{},
	}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return scanResponse, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return scanResponse, err
	}
	defer tx.Close(ctx)

	query := fmt.Sprintf(`
	MATCH (m:%s) -[:SCANNED]-> (n:CloudNode)
	WHERE m.node_id IN $scan_ids
	RETURN m.node_id, m.benchmark_types, m.status, m.status_message, n.node_id, m.created_at, m.updated_at, n.node_name`, scanType)

	res, err := tx.Run(ctx, query, map[string]interface{}{"scan_ids": scanIDs})
	if err != nil {
		return scanResponse, err
	}

	recs, err := res.Collect(ctx)
	if err != nil {
		return scanResponse, err
	}

	return model.ComplianceScanStatusResp{
		Statuses: extractStatusesWithBenchmarks(recs),
	}, nil
}

func extractStatusesWithBenchmarks(recs []*db.Record) []model.ComplianceScanInfo {
	statuses := make([]model.ComplianceScanInfo, 0, len(recs))
	for _, rec := range recs {
		var benchmarkTypes []string
		for _, rVal := range rec.Values[1].([]interface{}) {
			benchmarkTypes = append(benchmarkTypes, rVal.(string))
		}
		tmp := model.ComplianceScanInfo{
			ScanInfo: model.ScanInfo{
				ScanID:        rec.Values[0].(string),
				Status:        rec.Values[2].(string),
				StatusMessage: rec.Values[3].(string),
				NodeID:        rec.Values[4].(string),
				NodeType:      controls.ResourceTypeToString(controls.CloudAccount),
				CreatedAt:     rec.Values[5].(int64),
				UpdatedAt:     rec.Values[6].(int64),
				NodeName:      rec.Values[7].(string),
			},
			BenchmarkTypes: benchmarkTypes,
		}
		statuses = append(statuses, tmp)
	}
	return statuses
}

func NodeIdentifierToIDList(in []model.NodeIdentifier) []string {
	res := []string{}
	for i := range in {
		res = append(res, in[i].NodeID)
	}
	return res
}

func GetRegistriesImageIDs(ctx context.Context, registryIds []model.NodeIdentifier) ([]model.NodeIdentifier, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-registries-image-ids")
	defer span.End()

	res := []model.NodeIdentifier{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	nres, err := tx.Run(ctx, `
		MATCH (m:RegistryAccount)
		WHERE m.node_id IN $node_ids
		MATCH (m) -[:HOSTS]-> (n:ContainerImage)
		RETURN distinct n.node_id`,
		map[string]interface{}{"node_ids": NodeIdentifierToIDList(registryIds)})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect(ctx)
	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		res = append(res, model.NodeIdentifier{
			NodeID:   rec.Values[0].(string),
			NodeType: "image",
		})
	}

	return res, nil
}

func GetKubernetesImageIDs(ctx context.Context, k8sIds []model.NodeIdentifier) ([]model.NodeIdentifier, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-kubernetes-image-ids")
	defer span.End()

	res := []model.NodeIdentifier{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	nres, err := tx.Run(ctx, `
		MATCH (m:KubernetesCluster)
		WHERE m.node_id IN $node_ids
		MATCH (m) -[:INSTANCIATE]-> (n:Node)
		MATCH (n) -[:HOSTS]-> (i:ContainerImage)
		RETURN distinct i.node_id`,
		map[string]interface{}{"node_ids": NodeIdentifierToIDList(k8sIds)})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect(ctx)
	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		res = append(res, model.NodeIdentifier{
			NodeID:   rec.Values[0].(string),
			NodeType: "image",
		})
	}

	return res, nil
}

func GetKubernetesHostsIDs(ctx context.Context, k8sIds []model.NodeIdentifier) ([]model.NodeIdentifier, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-kubernetes-hosts-ids")
	defer span.End()

	res := []model.NodeIdentifier{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	nres, err := tx.Run(ctx, `
		MATCH (m:KubernetesCluster)
		WHERE m.node_id IN $node_ids
		MATCH (m) -[:INSTANCIATE]-> (n:Node)
		RETURN distinct n.node_id`,
		map[string]interface{}{"node_ids": NodeIdentifierToIDList(k8sIds)})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect(ctx)
	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		res = append(res, model.NodeIdentifier{
			NodeID:   rec.Values[0].(string),
			NodeType: "host",
		})
	}

	return res, nil
}

func GetKubernetesContainerIDs(ctx context.Context, k8sIds []model.NodeIdentifier) ([]model.NodeIdentifier, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-kubernetes-container-ids")
	defer span.End()

	res := []model.NodeIdentifier{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	nres, err := tx.Run(ctx, `
		MATCH (m:KubernetesCluster)
		WHERE m.node_id IN $node_ids
		MATCH (m) -[:INSTANCIATE]-> (n:Node)
		MATCH (n) -[:HOSTS]-> (i:Container)
		RETURN distinct i.node_id`,
		map[string]interface{}{"node_ids": NodeIdentifierToIDList(k8sIds)})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect(ctx)
	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		res = append(res, model.NodeIdentifier{
			NodeID:   rec.Values[0].(string),
			NodeType: "container",
		})
	}

	return res, nil
}

func GetPodContainerIDs(ctx context.Context, podIds []model.NodeIdentifier) ([]model.NodeIdentifier, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-pod-container-ids")
	defer span.End()

	res := []model.NodeIdentifier{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	nres, err := tx.Run(ctx, `
		MATCH (m:Container)
		WHERE m.pod_id IN $pod_ids
		RETURN m.node_id`,
		map[string]interface{}{"pod_ids": NodeIdentifierToIDList(podIds)})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect(ctx)
	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		res = append(res, model.NodeIdentifier{
			NodeID:   rec.Values[0].(string),
			NodeType: "container",
		})
	}

	return res, nil
}

func GetCloudAccountIDs(ctx context.Context, cloudProviderIds []model.NodeIdentifier) ([]model.NodeIdentifier, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-cloud-account-ids")
	defer span.End()

	res := []model.NodeIdentifier{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	nres, err := tx.Run(ctx, `
		MATCH (n:CloudNode)
		WHERE n.node_id IN $node_ids
		RETURN n.node_id, n.cloud_provider`,
		map[string]interface{}{"node_ids": NodeIdentifierToIDList(cloudProviderIds)})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect(ctx)
	if err != nil {
		return res, err
	}
	orgNodeIds := []string{}
	for _, rec := range recs {
		cloudProvider := rec.Values[1].(string)
		if cloudProvider == model.PostureProviderAWSOrg || cloudProvider == model.PostureProviderGCPOrg {
			orgNodeIds = append(orgNodeIds, rec.Values[0].(string))
			continue
		}
		res = append(res, model.NodeIdentifier{
			NodeID:   rec.Values[0].(string),
			NodeType: controls.ResourceTypeToString(controls.CloudAccount),
		})
	}
	if len(orgNodeIds) > 0 {
		nres, err = tx.Run(ctx, `
		MATCH (n:CloudNode) -[:IS_CHILD] -> (m)
		WHERE n.node_id IN $node_ids
		RETURN m.node_id`,
			map[string]interface{}{"node_ids": orgNodeIds})
		if err != nil {
			return res, err
		}
		recs, err = nres.Collect(ctx)
		if err != nil {
			return res, err
		}
		for _, rec := range recs {
			res = append(res, model.NodeIdentifier{
				NodeID:   rec.Values[0].(string),
				NodeType: controls.ResourceTypeToString(controls.CloudAccount),
			})
		}
	}

	return res, nil
}

func nodeType2Neo4jType(nodeType string) string {
	switch nodeType {
	case "container":
		return "Container"
	case "image":
		return "ContainerImage"
	case "container_image":
		return "ContainerImage"
	case "host":
		return "Node"
	case "cluster":
		return "KubernetesCluster"
	case "cloud_account":
		return "CloudNode"
	case "aws":
		return "CloudNode"
	case "gcp":
		return "CloudNode"
	case "azure":
		return "CloudNode"
	}
	return "unknown"
}

func GetScansList(ctx context.Context, scanType utils.Neo4jScanType, nodeIDs []model.NodeIdentifier, ff reporters.FieldsFilters, fw model.FetchWindow) (model.ScanListResp, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-scans-list")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return model.ScanListResp{}, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return model.ScanListResp{}, err
	}
	defer tx.Close(ctx)

	var scansInfo []model.ScanInfo
	var query string
	var nodeIDsStr []string
	if len(nodeIDs) != 0 {
		nodeIDsStr = []string{}
		nodeTypesStr := []string{}
		for _, nodeID := range nodeIDs {
			nodeIDsStr = append(nodeIDsStr, nodeID.NodeID)
			nodeTypesStr = append(nodeTypesStr, fmt.Sprintf("n:%s", nodeType2Neo4jType(nodeID.NodeType)))
		}
		query = `
			MATCH (m:` + string(scanType) + `) -[:SCANNED]-> (n)
			WHERE n.node_id IN $node_ids
			AND (` + strings.Join(nodeTypesStr, " OR ") + `)
			` + reporters.ParseFieldFilters2CypherWhereConditions("m", mo.Some(ff), false) + `
			RETURN m.node_id, m.status, m.status_message, m.created_at, m.updated_at, n.node_id, n.node_name, labels(n) as node_type
			ORDER BY m.updated_at ` + fw.FetchWindow2CypherQuery()
	} else {
		query = `
			MATCH (m:` + string(scanType) + `) -[:SCANNED]-> (n)
			` + reporters.ParseFieldFilters2CypherWhereConditions("m", mo.Some(ff), true) + `
			RETURN m.node_id, m.status, m.status_message, m.created_at, m.updated_at, n.node_id, n.node_name, labels(n) as node_type
			ORDER BY m.updated_at ` + fw.FetchWindow2CypherQuery()
	}
	scansInfo, err = processScansListQuery(ctx, query, nodeIDsStr, tx)
	if err != nil {
		return model.ScanListResp{}, err
	}
	return model.ScanListResp{ScansInfo: scansInfo}, nil
}

func processScansListQuery(ctx context.Context, query string, nodeIds []string, tx neo4j.ExplicitTransaction) ([]model.ScanInfo, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "process-scans-list-query")
	defer span.End()

	var scansInfo []model.ScanInfo
	res, err := tx.Run(ctx, query,
		map[string]interface{}{"node_ids": nodeIds})
	if err != nil {
		return scansInfo, err
	}

	recs, err := res.Collect(ctx)
	if err != nil {
		return scansInfo, reporters.ErrNotFound
	}

	for _, rec := range recs {
		tmp := model.ScanInfo{
			ScanID:        rec.Values[0].(string),
			Status:        rec.Values[1].(string),
			StatusMessage: rec.Values[2].(string),
			CreatedAt:     rec.Values[3].(int64),
			UpdatedAt:     rec.Values[4].(int64),
			NodeID:        rec.Values[5].(string),
			NodeName:      rec.Values[6].(string),
			NodeType:      Labels2NodeType(rec.Values[7].([]interface{})),
		}
		scansInfo = append(scansInfo, tmp)
	}
	return scansInfo, nil
}

func GetCloudCompliancePendingScansList(ctx context.Context, scanType utils.Neo4jScanType, nodeID string) (model.CloudComplianceScanListResp, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-cloudcompliance-pending-scans-list")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}
	defer tx.Close(ctx)

	res, err := tx.Run(ctx, `
		MATCH (m:`+string(scanType)+`) -[:SCANNED]-> (n:CloudNode{node_id: $node_id})
		WHERE m.status = $starting
		RETURN m.node_id, m.benchmark_types, m.status, m.status_message, n.node_id, m.created_at, m.updated_at, n.node_name ORDER BY m.updated_at`,
		map[string]interface{}{"node_id": nodeID, "starting": utils.ScanStatusStarting})
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}

	recs, err := res.Collect(ctx)
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}

	scansInfo := extractStatusesWithBenchmarks(recs)

	// Get the list of stopping scans
	{
		res, err := tx.Run(ctx, `
        MATCH (m:`+string(scanType)+`) -[:SCANNED]-> (n:CloudNode{node_id: $node_id})
		WHERE m.status=$cancel_pending
		SET m.status = $cancelling, m.updated_at = TIMESTAMP()
		WITH m,n
        RETURN m.node_id, m.status, m.status_message,
		n.node_id, m.updated_at, n.node_name ORDER BY m.updated_at`,
			map[string]interface{}{"node_id": nodeID,
				"cancel_pending": utils.ScanStatusCancelPending,
				"cancelling":     utils.ScanStatusCancelling})
		if err != nil {
			log.Info().Msgf("Failed to get stopping scan list for node:%s, error is:%v", nodeID, err)
		} else {
			recs, err := res.Collect(ctx)
			if err != nil {
				return model.CloudComplianceScanListResp{}, err
			}

			// _ = extractStatusesWithBenchmarks(recs, true)
			stoppingScansInfo := make([]model.ComplianceScanInfo, 0, len(recs))
			for _, rec := range recs {
				tmp := model.ComplianceScanInfo{
					ScanInfo: model.ScanInfo{
						ScanID:        rec.Values[0].(string),
						Status:        rec.Values[1].(string),
						StatusMessage: rec.Values[2].(string),
						NodeID:        rec.Values[3].(string),
						NodeType:      controls.ResourceTypeToString(controls.CloudAccount),
						UpdatedAt:     rec.Values[4].(int64),
						NodeName:      rec.Values[5].(string),
					},
					BenchmarkTypes: nil,
				}
				stoppingScansInfo = append(stoppingScansInfo, tmp)
			}

			if len(stoppingScansInfo) != 0 {
				scansInfo = append(scansInfo, stoppingScansInfo...)
			}
		}
	}

	err = tx.Commit(ctx)
	pendScanResp := model.CloudComplianceScanListResp{ScansInfo: scansInfo}

	return pendScanResp, err
}

func GetScanResultDiff[T any](ctx context.Context, scanType utils.Neo4jScanType, baseScanID, compareToScanID string, ff reporters.FieldsFilters, fw model.FetchWindow) ([]T, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-scan-result-diff")
	defer span.End()

	res := []T{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	query := fmt.Sprintf(`
		OPTIONAL MATCH (n:%s{node_id:$base_scan_id})
		RETURN n IS NOT NULL AS Exists`,
		scanType)
	log.Debug().Msgf("query: %v", query)
	r, err := tx.Run(ctx, query,
		map[string]interface{}{
			"base_scan_id": baseScanID,
		})
	if err != nil {
		return res, err
	}

	rec, err := r.Single(ctx)
	if err != nil {
		return res, err
	}

	if !rec.Values[0].(bool) {
		return res, &NodeNotFoundError{
			nodeID: baseScanID,
		}
	}

	ffCondition := reporters.OrderFilter2CypherCondition("d", ff.OrderFilter, nil)

	fname := scanResultIDField(scanType)
	if len(fname) > 0 {
		str := "d." + fname + " ASC"
		if len(ffCondition) > 0 {
			ffCondition = ffCondition + "," + str
		}
	}

	query = `
	MATCH (m:` + string(scanType) + `{node_id: $base_scan_id}) -[r:DETECTED]-> (d2)
	WITH collect(d2) as dset
	MATCH (n:` + string(scanType) + `{node_id: $compare_to_scan_id}) -[r:DETECTED]-> (d)
	WHERE NOT d in dset
	OPTIONAL MATCH (d) -[:IS]-> (e)
	OPTIONAL MATCH (n) -[:SCANNED]-> (f)
	OPTIONAL MATCH (c:ContainerImage{node_id: f.docker_image_id}) -[:ALIAS] ->(t) -[ma:MASKED]-> (d)
	OPTIONAL MATCH (cb:ContainerImage{node_id: n.docker_image_id}) -[:IS] ->(is) -[mis:MASKED]-> (d)
	WITH e, d, r, collect(ma) as ma_list, collect(mis) as mis_list
	WITH apoc.map.merge( e{.*}, 
	d{.*, masked: coalesce(d.masked or r.masked or e.masked or head(ma_list).masked or head(mis_list).masked, false), 
	name: coalesce(e.name, d.name, '')}) AS merged_data` +
		reporters.ParseFieldFilters2CypherWhereConditions("d", mo.Some(ff), true) +
		ffCondition + ` RETURN merged_data ` +
		fw.FetchWindow2CypherQuery()
	log.Debug().Msgf("diff query: %v", query)
	nres, err := tx.Run(ctx, query,
		map[string]interface{}{
			"base_scan_id":       baseScanID,
			"compare_to_scan_id": compareToScanID,
		})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect(ctx)
	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		var tmp T
		utils.FromMap(rec.Values[0].(map[string]interface{}), &tmp)
		res = append(res, tmp)
	}

	return res, nil
}

func GetScanResults[T any](ctx context.Context, scanType utils.Neo4jScanType, scanID string, ff reporters.FieldsFilters, fw model.FetchWindow) ([]T, model.ScanResultsCommon, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-scan-results")
	defer span.End()

	res := []T{}
	common := model.ScanResultsCommon{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, common, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, common, err
	}
	defer tx.Close(ctx)

	query := fmt.Sprintf(`
		OPTIONAL MATCH (n:%s{node_id:$node_id})
		RETURN n IS NOT NULL AS Exists`,
		scanType)
	log.Debug().Msgf("query: %v", query)
	r, err := tx.Run(ctx, query,
		map[string]interface{}{
			"node_id": scanID,
		})
	if err != nil {
		return res, common, err
	}

	rec, err := r.Single(ctx)
	if err != nil {
		return res, common, err
	}

	if !rec.Values[0].(bool) {
		return res, common, &NodeNotFoundError{
			nodeID: scanID,
		}
	}

	ffCondition := reporters.OrderFilter2CypherCondition("d", ff.OrderFilter, nil)

	fname := scanResultIDField(scanType)
	if len(fname) > 0 {
		str := "d." + fname + " ASC"
		if len(ffCondition) > 0 {
			ffCondition = ffCondition + "," + str
		}
	}

	query = `
		MATCH (s:` + string(scanType) + `{node_id: $scan_id}) -[r:DETECTED]-> (d)
		OPTIONAL MATCH (d) -[:IS]-> (e)
		OPTIONAL MATCH (s) -[:SCANNED]-> (n)
		OPTIONAL MATCH (ca:ContainerImage{node_id: n.docker_image_id}) -[:ALIAS] ->(t) -[m:MASKED]-> (d)
		WITH d, n, e, r, m
		OPTIONAL MATCH (cb:ContainerImage{node_id: n.docker_image_id}) -[:IS] ->(is) -[mis:MASKED]-> (d)
		WITH apoc.map.merge( e{.*},
		d{.*, masked: coalesce(d.masked or r.masked or e.masked 
			or m.masked or mis.masked, false),
		name: coalesce(e.name, d.name, '')}) as d` +
		reporters.ParseFieldFilters2CypherWhereConditions("d", mo.Some(ff), true) +
		ffCondition + ` RETURN d ` +
		fw.FetchWindow2CypherQuery()
	log.Debug().Msgf("query: %v", query)
	nres, err := tx.Run(ctx, query,
		map[string]interface{}{"scan_id": scanID})
	if err != nil {
		return res, common, err
	}

	recs, err := nres.Collect(ctx)
	if err != nil {
		return res, common, err
	}

	for _, rec := range recs {
		var tmp T
		utils.FromMap(rec.Values[0].(map[string]interface{}), &tmp)
		res = append(res, tmp)
	}

	ncommonres, err := tx.Run(ctx, `
		MATCH (m:`+string(scanType)+`{node_id: $scan_id}) -[:SCANNED]-> (n)
		RETURN n{.*, scan_id: m.node_id, updated_at:m.updated_at, created_at:m.created_at}`,
		map[string]interface{}{"scan_id": scanID})
	if err != nil {
		return res, common, err
	}

	rec, err = ncommonres.Single(ctx)
	if err != nil {
		return res, common, err
	}

	utils.FromMap(rec.Values[0].(map[string]interface{}), &common)

	return res, common, nil
}

func GetFilters(ctx context.Context, having map[string]interface{}, detectedType string, filters []string) (map[string][]string, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-filters")
	defer span.End()

	andQuery := "{"
	index := 0
	for key := range having {
		if index == 0 {
			andQuery += fmt.Sprintf("%s:$%s", key, key)
		} else {
			andQuery += fmt.Sprintf(",%s:$%s", key, key)
		}
		index++
	}
	andQuery += "}"

	res := make(map[string][]string)

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)
	for _, filterField := range filters {
		query := fmt.Sprintf(`
		MATCH (n:%s%s)
		RETURN distinct n.%s`,
			detectedType, andQuery, filterField)
		nres, err := tx.Run(ctx, query, having)
		if err != nil {
			return res, err
		}

		recs, err := nres.Collect(ctx)
		if err != nil {
			return res, err
		}
		for _, rec := range recs {
			if len(rec.Values) > 0 && rec.Values[0] != nil {
				res[filterField] = append(res[filterField], rec.Values[0].(string))
			}
		}
	}
	return res, nil
}

func scanResultIDField(scanType utils.Neo4jScanType) string {
	switch scanType {
	case utils.NEO4JVulnerabilityScan:
		return "cve_id"
	case utils.NEO4JSecretScan:
		return "node_id"
	case utils.NEO4JMalwareScan:
		return "node_id"
	case utils.NEO4JComplianceScan:
		return "test_number"
	case utils.NEO4JCloudComplianceScan:
		return "control_id"
	}
	return ""
}

func type2sevField(scanType utils.Neo4jScanType) string {
	switch scanType {
	case utils.NEO4JVulnerabilityScan:
		return "cve_severity"
	case utils.NEO4JSecretScan:
		return "level"
	case utils.NEO4JMalwareScan:
		return "file_severity"
	case utils.NEO4JComplianceScan:
		return "status"
	case utils.NEO4JCloudComplianceScan:
		return "status"
	}
	return "error_sev_field_unknown"
}

func GetSevCounts(ctx context.Context, scanType utils.Neo4jScanType, scanID string) (map[string]int32, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-sev-counts")
	defer span.End()

	res := map[string]int32{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	query := `
	MATCH (m:` + string(scanType) + `{node_id: $scan_id, status: "` + utils.ScanStatusSuccess + `"}) -[r:DETECTED]-> (d)
	WHERE r.masked = false
	OPTIONAL MATCH (m) -[:SCANNED] -> (e)
	OPTIONAL MATCH (c:ContainerImage{node_id: e.docker_image_id}) -[:ALIAS] ->(t) -[ma:MASKED]-> (d)
	WITH d, ma, r WHERE ma IS NULL OR ma.masked=false
	RETURN d.` + type2sevField(scanType) + `, COUNT(*)`

	log.Debug().Msgf("query: %v", query)
	nres, err := tx.Run(ctx, query, map[string]interface{}{"scan_id": scanID})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect(ctx)
	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		if len(rec.Values) > 0 && rec.Values[0] != nil && rec.Values[1] != nil {
			res[rec.Values[0].(string)] = int32(rec.Values[1].(int64))
		}
	}

	return res, nil
}

func GetNodesInScanResults(ctx context.Context, scanType utils.Neo4jScanType, resultIds []string) ([]model.ScanResultBasicNode, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-nodes-in-scan-results")
	defer span.End()

	res := make([]model.ScanResultBasicNode, 0)
	if len(resultIds) == 0 {
		return res, nil
	}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	resultIDKey := "collect(distinct d." + reporters.ScanResultIDField[scanType] + ")"
	nres, err := tx.Run(ctx, `
		MATCH (node) <- [s:SCANNED] - (m:`+string(scanType)+`) - [r:DETECTED] -> (d:`+utils.ScanTypeDetectedNode[scanType]+`)
		WHERE r.masked = false AND d.`+reporters.ScanResultIDField[scanType]+` IN $result_ids
		RETURN `+resultIDKey+`,node.host_name,node.node_id,node.node_type,node.docker_container_name,node.docker_image_name,node.docker_image_tag`,
		map[string]interface{}{"result_ids": resultIds})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect(ctx)
	if err != nil {
		return res, err
	}
	tempRes := make(map[string][]model.BasicNode)
	for _, rec := range recs {
		hostName := reporters.Neo4jGetStringRecord(rec, "node.host_name", "")
		nodeName := reporters.Neo4jGetStringRecord(rec, "node.node_name", "")
		nodeType := reporters.Neo4jGetStringRecord(rec, "node.node_type", "")
		node := model.BasicNode{
			NodeID:   reporters.Neo4jGetStringRecord(rec, "node.node_id", ""),
			Name:     nodeName,
			NodeType: nodeType,
			HostName: hostName,
		}

		resultIDs := reporters.Neo4jGetSliceRecord(rec, resultIDKey, []interface{}{})
		for _, resultID := range resultIDs {
			tempRes[resultID.(string)] = append(tempRes[resultID.(string)], node)
		}
	}
	for resultID, basicNodes := range tempRes {
		res = append(res, model.ScanResultBasicNode{
			ResultID:   resultID,
			BasicNodes: basicNodes,
		})
	}
	return res, nil
}

func GetCloudComplianceStats(ctx context.Context, scanID string, neo4jComplianceType utils.Neo4jScanType) (model.ComplianceAdditionalInfo, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-cloudcompliance-stats")
	defer span.End()

	res := map[string]int32{}
	additionalInfo := model.ComplianceAdditionalInfo{StatusCounts: res, CompliancePercentage: 0.0}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return additionalInfo, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return additionalInfo, err
	}
	defer tx.Close(ctx)

	benchRes, err := tx.Run(ctx, `
		MATCH (m:`+string(neo4jComplianceType)+`{node_id: $scan_id})
		RETURN m.benchmark_types`,
		map[string]interface{}{"scan_id": scanID})
	if err != nil {
		return additionalInfo, err
	}

	benchRec, err := benchRes.Single(ctx)
	if err != nil {
		return additionalInfo, err
	}

	var benchmarkTypes []string
	for _, rVal := range benchRec.Values[0].([]interface{}) {
		benchmarkTypes = append(benchmarkTypes, rVal.(string))
	}
	additionalInfo.BenchmarkTypes = benchmarkTypes

	cloudComplianceFields := ""
	if neo4jComplianceType == utils.NEO4JCloudComplianceScan {
		cloudComplianceFields = "DISTINCT d.control_id AS control_id, d.resource AS resource,"
	}
	nres, err := tx.Run(ctx, `
		MATCH (m:`+string(neo4jComplianceType)+`{node_id: $scan_id}) -[:DETECTED]-> (d)
		WITH `+cloudComplianceFields+` d.status AS status
		RETURN status, COUNT(status)`,
		map[string]interface{}{"scan_id": scanID})
	if err != nil {
		return additionalInfo, err
	}

	recs, err := nres.Collect(ctx)
	if err != nil {
		return additionalInfo, err
	}

	var positiveStatusCount int32
	var totalStatusCount int32
	for i := range recs {
		status := recs[i].Values[0].(string)
		statusCount := int32(recs[i].Values[1].(int64))
		res[status] = statusCount
		if status == "info" || status == "ok" || status == "pass" {
			positiveStatusCount += statusCount
		}
		totalStatusCount += statusCount
	}
	additionalInfo.StatusCounts = res
	if totalStatusCount > 0 {
		additionalInfo.CompliancePercentage = float64(positiveStatusCount) * 100 / float64(totalStatusCount)
	}

	return additionalInfo, nil
}

func GetBulkScans(ctx context.Context, scanType utils.Neo4jScanType, scanID string) (model.ScanStatusResp, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-bulk-scans")
	defer span.End()

	scanIDs := model.ScanStatusResp{
		Statuses: map[string]model.ScanInfo{},
	}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return scanIDs, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return scanIDs, err
	}
	defer tx.Close(ctx)

	r, err := tx.Run(ctx, fmt.Sprintf(`
		OPTIONAL MATCH (n:Bulk%s{node_id:$node_id})
		RETURN n IS NOT NULL AS Exists`,
		scanType),
		map[string]interface{}{
			"node_id": scanID,
		})
	if err != nil {
		return scanIDs, err
	}

	recc, err := r.Single(ctx)
	if err != nil {
		return scanIDs, err
	}

	if !recc.Values[0].(bool) {
		return scanIDs, &NodeNotFoundError{
			nodeID: scanID,
		}
	}

	neoRes, err := tx.Run(ctx, `
		MATCH (m:Bulk`+string(scanType)+`{node_id:$scan_id}) -[:BATCH]-> (d:`+string(scanType)+`) -[:SCANNED]-> (n)
		RETURN d.node_id as scan_id, d.status, d.status_message, n.node_id as node_id, n.node_name, labels(n) as node_type, d.created_at, d.updated_at`,
		map[string]interface{}{"scan_id": scanID})
	if err != nil {
		return scanIDs, err
	}

	recs, err := neoRes.Collect(ctx)
	if err != nil {
		return scanIDs, reporters.ErrNotFound
	}

	return model.ScanStatusResp{
		Statuses: extractStatuses(recs),
	}, nil
}

func Labels2NodeType(labels []interface{}) string {
	for i := range labels {
		str := fmt.Sprintf("%v", labels[i])
		switch str {
		case "Node":
			return "host"
		case "ContainerImage":
			return "image"
		case "Container":
			return "container"
		case "KubernetesCluster":
			return "cluster"
		case "RegistryAccount":
			return "registry"
		case "CloudNode":
			return "cloud_account"
		}
	}
	return "unknown"
}

func GetComplianceBulkScans(ctx context.Context, scanType utils.Neo4jScanType, scanID string) (model.ComplianceScanStatusResp, error) {

	ctx, span := telemetry.NewSpan(ctx, "scan-reports", "get-compliance-bulk-scans")
	defer span.End()

	scanIDs := model.ComplianceScanStatusResp{
		Statuses: []model.ComplianceScanInfo{},
	}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msgf("Neo4j client init failed: %+v", err)
		return scanIDs, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		log.Error().Msgf("Failed to begin new neo4j transaction: %+v", err)
		return scanIDs, err
	}
	defer tx.Close(ctx)

	neoRes, err := tx.Run(ctx, `
		MATCH (m:Bulk`+string(scanType)+`{node_id:$scan_id}) -[:BATCH]-> (d:`+string(scanType)+`) -[:SCANNED]-> (n:CloudNode)
		RETURN d.node_id, d.benchmark_types, d.status, d.status_message, n.node_id, d.created_at, d.updated_at, n.node_name`,
		map[string]interface{}{"scan_id": scanID})
	if err != nil {
		log.Error().Msgf("Compliance bulk scans status query failed: %+v", err)
		return scanIDs, err
	}

	recs, err := neoRes.Collect(ctx)
	if err != nil {
		log.Error().Msgf("Compliance bulk scan neo4j result collection failed: %+v", err)
		return scanIDs, err
	}

	return model.ComplianceScanStatusResp{
		Statuses: extractStatusesWithBenchmarks(recs),
	}, nil
}
