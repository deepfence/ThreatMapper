package reporters_scan

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/db"
	"github.com/samber/mo"
)

type NodeNotFoundError struct {
	node_id string
}

func (ve *NodeNotFoundError) Error() string {
	return fmt.Sprintf("Node %v not found", ve.node_id)
}

func GetScanStatus(ctx context.Context, scan_type utils.Neo4jScanType, scan_ids []string) (model.ScanStatusResp, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return model.ScanStatusResp{}, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return model.ScanStatusResp{}, err
	}
	defer tx.Close()

	r, err := tx.Run(fmt.Sprintf(`
		OPTIONAL MATCH (n:%s)
		WHERE n.node_id IN $node_ids
		RETURN COUNT(n) <> 0 AS Exists`,
		scan_type),
		map[string]interface{}{
			"node_ids": scan_ids,
		})
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	recc, err := r.Single()
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	if !recc.Values[0].(bool) {
		return model.ScanStatusResp{},
			&NodeNotFoundError{
				node_id: "unknown",
			}
	}

	res, err := tx.Run(fmt.Sprintf(`
		MATCH (m:%s) -[:SCANNED]-> (n)
		WHERE m.node_id IN $scan_ids
		RETURN m.node_id, m.status, m.status_message, n.node_id, n.node_name, labels(n) as node_type, m.updated_at`, scan_type),
		map[string]interface{}{"scan_ids": scan_ids})
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	recs, err := res.Collect()
	if err != nil {
		return model.ScanStatusResp{}, reporters.NotFoundErr
	}

	return model.ScanStatusResp{Statuses: extractStatuses(recs)}, nil
}

func extractStatuses(recs []*db.Record) map[string]model.ScanInfo {
	statuses := map[string]model.ScanInfo{}
	for _, rec := range recs {
		info := model.ScanInfo{
			ScanId:        rec.Values[0].(string),
			Status:        rec.Values[1].(string),
			StatusMessage: rec.Values[2].(string),
			NodeId:        rec.Values[3].(string),
			NodeName:      rec.Values[4].(string),
			NodeType:      Labels2NodeType(rec.Values[5].([]interface{})),
			UpdatedAt:     rec.Values[6].(int64),
		}
		statuses[rec.Values[0].(string)] = info
	}
	return statuses
}

func GetComplianceScanStatus(ctx context.Context, scanType utils.Neo4jScanType, scanIds []string) (model.ComplianceScanStatusResp, error) {
	scanResponse := model.ComplianceScanStatusResp{
		Statuses: []model.ComplianceScanInfo{},
	}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return scanResponse, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return scanResponse, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return scanResponse, err
	}
	defer tx.Close()

	query := fmt.Sprintf(`
	MATCH (m:%s) -[:SCANNED]-> (n:CloudNode)
	WHERE m.node_id IN $scan_ids
	RETURN m.node_id, m.benchmark_types, m.status, m.status_message, n.node_id, m.updated_at, n.node_name`, scanType)

	res, err := tx.Run(query, map[string]interface{}{"scan_ids": scanIds})
	if err != nil {
		return scanResponse, err
	}

	recs, err := res.Collect()
	if err != nil {
		return scanResponse, err
	}

	return model.ComplianceScanStatusResp{
		Statuses: extractStatusesWithBenchmarks(recs),
	}, nil
}

func extractStatusesWithBenchmarks(recs []*db.Record) []model.ComplianceScanInfo {
	statuses := []model.ComplianceScanInfo{}
	for _, rec := range recs {
		var benchmarkTypes []string
		for _, rVal := range rec.Values[1].([]interface{}) {
			benchmarkTypes = append(benchmarkTypes, rVal.(string))
		}
		tmp := model.ComplianceScanInfo{
			ScanInfo: model.ScanInfo{
				ScanId:        rec.Values[0].(string),
				Status:        rec.Values[2].(string),
				StatusMessage: rec.Values[3].(string),
				NodeId:        rec.Values[4].(string),
				NodeType:      controls.ResourceTypeToString(controls.CloudAccount),
				UpdatedAt:     rec.Values[5].(int64),
				NodeName:      rec.Values[6].(string),
			},
			BenchmarkTypes: benchmarkTypes,
		}
		statuses = append(statuses, tmp)
	}
	return statuses
}

func NodeIdentifierToIdList(in []model.NodeIdentifier) []string {
	res := []string{}
	for i := range in {
		res = append(res, in[i].NodeId)
	}
	return res
}

func GetRegistriesImageIDs(ctx context.Context, registryIds []model.NodeIdentifier) ([]model.NodeIdentifier, error) {
	res := []model.NodeIdentifier{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	nres, err := tx.Run(`
		MATCH (m:RegistryAccount)
		WHERE m.node_id IN $node_ids
		MATCH (m) -[:HOSTS]-> (n:ContainerImage)
		RETURN distinct n.node_id`,
		map[string]interface{}{"node_ids": NodeIdentifierToIdList(registryIds)})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect()
	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		res = append(res, model.NodeIdentifier{
			NodeId:   rec.Values[0].(string),
			NodeType: "image",
		})
	}

	return res, nil
}

func GetKubernetesImageIDs(ctx context.Context, k8sIds []model.NodeIdentifier) ([]model.NodeIdentifier, error) {
	res := []model.NodeIdentifier{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	nres, err := tx.Run(`
		MATCH (m:KubernetesCluster)
		WHERE m.node_id IN $node_ids
		MATCH (m) -[:INSTANCIATE]-> (n:Node)
		MATCH (n) -[:HOSTS]-> (i:ContainerImage)
		RETURN distinct i.node_id`,
		map[string]interface{}{"node_ids": NodeIdentifierToIdList(k8sIds)})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect()
	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		res = append(res, model.NodeIdentifier{
			NodeId:   rec.Values[0].(string),
			NodeType: "image",
		})
	}

	return res, nil
}

func GetKubernetesHostsIDs(ctx context.Context, k8sIds []model.NodeIdentifier) ([]model.NodeIdentifier, error) {
	res := []model.NodeIdentifier{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	nres, err := tx.Run(`
		MATCH (m:KubernetesCluster)
		WHERE m.node_id IN $node_ids
		MATCH (m) -[:INSTANCIATE]-> (n:Node)
		RETURN distinct n.node_id`,
		map[string]interface{}{"node_ids": NodeIdentifierToIdList(k8sIds)})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect()
	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		res = append(res, model.NodeIdentifier{
			NodeId:   rec.Values[0].(string),
			NodeType: "host",
		})
	}

	return res, nil
}

func GetKubernetesContainerIDs(ctx context.Context, k8sIds []model.NodeIdentifier) ([]model.NodeIdentifier, error) {
	res := []model.NodeIdentifier{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	nres, err := tx.Run(`
		MATCH (m:KubernetesCluster)
		WHERE m.node_id IN $node_ids
		MATCH (m) -[:INSTANCIATE]-> (n:Node)
		MATCH (n) -[:HOSTS]-> (i:Container)
		RETURN distinct i.node_id`,
		map[string]interface{}{"node_ids": NodeIdentifierToIdList(k8sIds)})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect()
	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		res = append(res, model.NodeIdentifier{
			NodeId:   rec.Values[0].(string),
			NodeType: "container",
		})
	}

	return res, nil
}

func GetCloudAccountIDs(ctx context.Context, cloudProviderIds []model.NodeIdentifier) ([]model.NodeIdentifier, error) {
	res := []model.NodeIdentifier{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	nres, err := tx.Run(`
		MATCH (n:CloudNode)
		WHERE n.cloud_provider IN $node_ids
		RETURN n.node_id`,
		map[string]interface{}{"node_ids": NodeIdentifierToIdList(cloudProviderIds)})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect()
	if err != nil {
		return res, err
	}

	for _, rec := range recs {
		res = append(res, model.NodeIdentifier{
			NodeId:   rec.Values[0].(string),
			NodeType: controls.ResourceTypeToString(controls.CloudAccount),
		})
	}

	return res, nil
}

func nodeType2Neo4jType(node_type string) string {
	switch node_type {
	case "container":
		return "Container"
	case "image":
		return "ContainerImage"
	case "host":
		return "Node"
	case "cluster":
		return "KubernetesCluster"
	case "cloud_account":
		return "CloudNode"
	}
	return "unknown"
}

func GetScansList(ctx context.Context, scan_type utils.Neo4jScanType, node_ids []model.NodeIdentifier, ff reporters.FieldsFilters, fw model.FetchWindow) (model.ScanListResp, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return model.ScanListResp{}, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return model.ScanListResp{}, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return model.ScanListResp{}, err
	}
	defer tx.Close()

	var scansInfo []model.ScanInfo
	var query string
	var node_ids_str []string
	if len(node_ids) != 0 {
		node_ids_str = []string{}
		node_types_str := []string{}
		for _, node_id := range node_ids {
			node_ids_str = append(node_ids_str, node_id.NodeId)
			node_types_str = append(node_types_str, fmt.Sprintf("n:%s", nodeType2Neo4jType(node_id.NodeType)))
		}
		query = `
			MATCH (m:` + string(scan_type) + `) -[:SCANNED]-> (n)
			WHERE n.node_id IN $node_ids
			AND (` + strings.Join(node_types_str, " OR ") + `)
			` + reporters.ParseFieldFilters2CypherWhereConditions("m", mo.Some(ff), false) + `
			RETURN m.node_id, m.status, m.status_message, m.updated_at, n.node_id, n.node_name, labels(n) as node_type
			ORDER BY m.updated_at ` + fw.FetchWindow2CypherQuery()
	} else {
		query = `
			MATCH (m:` + string(scan_type) + `) -[:SCANNED]-> (n)
			` + reporters.ParseFieldFilters2CypherWhereConditions("m", mo.Some(ff), true) + `
			RETURN m.node_id, m.status, m.status_message, m.updated_at, n.node_id, n.node_name, labels(n) as node_type
			ORDER BY m.updated_at ` + fw.FetchWindow2CypherQuery()
	}
	scansInfo, err = processScansListQuery(query, node_ids_str, tx)
	if err != nil {
		return model.ScanListResp{}, err
	}
	return model.ScanListResp{ScansInfo: scansInfo}, nil
}

func processScansListQuery(query string, nodeIds []string, tx neo4j.Transaction) ([]model.ScanInfo, error) {
	var scansInfo []model.ScanInfo
	res, err := tx.Run(query,
		map[string]interface{}{"node_ids": nodeIds})
	if err != nil {
		return scansInfo, err
	}

	recs, err := res.Collect()
	if err != nil {
		return scansInfo, reporters.NotFoundErr
	}

	for _, rec := range recs {
		tmp := model.ScanInfo{
			ScanId:        rec.Values[0].(string),
			Status:        rec.Values[1].(string),
			StatusMessage: rec.Values[2].(string),
			UpdatedAt:     rec.Values[3].(int64),
			NodeId:        rec.Values[4].(string),
			NodeName:      rec.Values[5].(string),
			NodeType:      Labels2NodeType(rec.Values[6].([]interface{})),
		}
		scansInfo = append(scansInfo, tmp)
	}
	return scansInfo, nil
}

func GetCloudCompliancePendingScansList(ctx context.Context, scanType utils.Neo4jScanType, nodeId string) (model.CloudComplianceScanListResp, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}
	defer tx.Close()

	res, err := tx.Run(`
		MATCH (m:`+string(scanType)+`) -[:SCANNED]-> (n:CloudNode{node_id: $node_id})
		WHERE NOT m.status = $complete AND NOT m.status = $failed AND NOT m.status = $in_progress
		RETURN m.node_id, m.benchmark_types, m.status, m.status_message, n.node_id, m.updated_at, n.node_name ORDER BY m.updated_at`,
		map[string]interface{}{"node_id": nodeId, "complete": utils.SCAN_STATUS_SUCCESS, "failed": utils.SCAN_STATUS_FAILED, "in_progress": utils.SCAN_STATUS_INPROGRESS})
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}

	recs, err := res.Collect()
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}

	return model.CloudComplianceScanListResp{
		ScansInfo: extractStatusesWithBenchmarks(recs),
	}, nil
}

func GetScanResults[T any](ctx context.Context, scan_type utils.Neo4jScanType, scan_id string, ff reporters.FieldsFilters, fw model.FetchWindow) ([]T, model.ScanResultsCommon, error) {
	res := []T{}
	common := model.ScanResultsCommon{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, common, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, common, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, common, err
	}
	defer tx.Close()

	query := fmt.Sprintf(`
		OPTIONAL MATCH (n:%s{node_id:$node_id})
		RETURN n IS NOT NULL AS Exists`,
		scan_type)
	log.Info().Msgf("query: %v", query)
	r, err := tx.Run(query,
		map[string]interface{}{
			"node_id": scan_id,
		})
	if err != nil {
		return res, common, err
	}

	rec, err := r.Single()
	if err != nil {
		return res, common, err
	}

	if !rec.Values[0].(bool) {
		return res, common, &NodeNotFoundError{
			node_id: scan_id,
		}
	}

	query = `
		MATCH (m:` + string(scan_type) + `{node_id: $scan_id}) -[r:DETECTED]-> (d)
		OPTIONAL MATCH (d) -[:IS]-> (e)
	WITH apoc.map.merge( e{.*}, d{.*, masked: coalesce(d.masked or r.masked, false), name: coalesce(e.name, d.name, '')}) as d` +
		reporters.ParseFieldFilters2CypherWhereConditions("d", mo.Some(ff), true) +
		reporters.OrderFilter2CypherCondition("d", ff.OrderFilter) +
		` RETURN d ` +
		fw.FetchWindow2CypherQuery()
	log.Info().Msgf("query: %v", query)
	nres, err := tx.Run(query,
		map[string]interface{}{"scan_id": scan_id})
	if err != nil {
		return res, common, err
	}

	recs, err := nres.Collect()
	if err != nil {
		return res, common, err
	}

	for _, rec := range recs {
		var tmp T
		utils.FromMap(rec.Values[0].(map[string]interface{}), &tmp)
		res = append(res, tmp)
	}

	ncommonres, err := tx.Run(`
		MATCH (m:`+string(scan_type)+`{node_id: $scan_id}) -[:SCANNED]-> (n)
		RETURN n{.*, scan_id: m.node_id, updated_at:m.updated_at, created_at:m.created_at}`,
		map[string]interface{}{"scan_id": scan_id})
	if err != nil {
		return res, common, err
	}

	rec, err = ncommonres.Single()
	if err != nil {
		return res, common, err
	}

	utils.FromMap(rec.Values[0].(map[string]interface{}), &common)

	return res, common, nil
}

func GetFilters(ctx context.Context, having map[string]interface{}, detectedType string, filters []string) (map[string][]string, error) {
	andQuery := "{"
	index := 0
	for key, _ := range having {
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
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, err
	}
	defer session.Close()
	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()
	for _, filterField := range filters {
		query := fmt.Sprintf(`
		MATCH (n:%s%s)
		RETURN distinct n.%s`,
			detectedType, andQuery, filterField)
		nres, err := tx.Run(query, having)
		if err != nil {
			return res, err
		}

		recs, err := nres.Collect()
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

func type2sev_field(scan_type utils.Neo4jScanType) string {
	switch scan_type {
	case utils.NEO4J_VULNERABILITY_SCAN:
		return "cve_severity"
	case utils.NEO4J_SECRET_SCAN:
		return "level"
	case utils.NEO4J_MALWARE_SCAN:
		return "file_severity"
	case utils.NEO4J_COMPLIANCE_SCAN:
		return "status"
	case utils.NEO4J_CLOUD_COMPLIANCE_SCAN:
		return "status"
	}
	return "error_sev_field_unknown"
}

func GetSevCounts(ctx context.Context, scan_type utils.Neo4jScanType, scan_id string) (map[string]int32, error) {
	res := map[string]int32{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	query := `
	MATCH (m:` + string(scan_type) + `{node_id: $scan_id, status: "` + utils.SCAN_STATUS_SUCCESS + `"}) -[r:DETECTED]-> (d)
	WHERE r.masked = false
	RETURN d.` + type2sev_field(scan_type) + `, COUNT(*)`

	nres, err := tx.Run(query, map[string]interface{}{"scan_id": scan_id})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect()
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
	res := make([]model.ScanResultBasicNode, 0)
	if len(resultIds) == 0 {
		return res, nil
	}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	resultIdKey := "collect(distinct d." + reporters.ScanResultIDField[scanType] + ")"
	nres, err := tx.Run(`
		MATCH (node) <- [s:SCANNED] - (m:`+string(scanType)+`) - [r:DETECTED] -> (d:`+utils.ScanTypeDetectedNode[scanType]+`)
		WHERE r.masked = false AND d.`+reporters.ScanResultIDField[scanType]+` IN $result_ids
		RETURN `+resultIdKey+`,node.host_name,node.node_id,node.node_type,node.docker_container_name,node.docker_image_name,node.docker_image_tag`,
		map[string]interface{}{"result_ids": resultIds})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect()
	if err != nil {
		return res, err
	}
	tempRes := make(map[string][]model.BasicNode)
	for _, rec := range recs {
		hostName := reporters.Neo4jGetStringRecord(rec, "node.host_name", "")
		nodeName := reporters.Neo4jGetStringRecord(rec, "node.node_name", "")
		nodeType := reporters.Neo4jGetStringRecord(rec, "node.node_type", "")
		node := model.BasicNode{
			NodeId:   reporters.Neo4jGetStringRecord(rec, "node.node_id", ""),
			Name:     nodeName,
			NodeType: nodeType,
			HostName: hostName,
		}

		resultIDs := reporters.Neo4jGetSliceRecord(rec, resultIdKey, []interface{}{})
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

func GetCloudComplianceStats(ctx context.Context, scanId string, neo4jComplianceType utils.Neo4jScanType) (model.ComplianceAdditionalInfo, error) {
	res := map[string]int32{}
	additionalInfo := model.ComplianceAdditionalInfo{StatusCounts: res, CompliancePercentage: 0.0}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return additionalInfo, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return additionalInfo, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return additionalInfo, err
	}
	defer tx.Close()

	benchRes, err := tx.Run(`
		MATCH (m:`+string(neo4jComplianceType)+`{node_id: $scan_id})
		RETURN m.benchmark_types`,
		map[string]interface{}{"scan_id": scanId})
	if err != nil {
		return additionalInfo, err
	}

	benchRec, err := benchRes.Single()
	if err != nil {
		return additionalInfo, err
	}

	var benchmarkTypes []string
	for _, rVal := range benchRec.Values[0].([]interface{}) {
		benchmarkTypes = append(benchmarkTypes, rVal.(string))
	}
	additionalInfo.BenchmarkTypes = benchmarkTypes

	cloudComplianceFields := ""
	if neo4jComplianceType == utils.NEO4J_CLOUD_COMPLIANCE_SCAN {
		cloudComplianceFields = "DISTINCT d.control_id AS control_id, d.resource AS resource,"
	}
	nres, err := tx.Run(`
		MATCH (m:`+string(neo4jComplianceType)+`{node_id: $scan_id}) -[:DETECTED]-> (d)
		WITH `+cloudComplianceFields+` d.status AS status
		RETURN status, COUNT(status)`,
		map[string]interface{}{"scan_id": scanId})
	if err != nil {
		return additionalInfo, err
	}

	recs, err := nres.Collect()
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

func GetBulkScans(ctx context.Context, scan_type utils.Neo4jScanType, scan_id string) (model.ScanStatusResp, error) {
	scan_ids := model.ScanStatusResp{
		Statuses: map[string]model.ScanInfo{},
	}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return scan_ids, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return scan_ids, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return scan_ids, err
	}
	defer tx.Close()

	r, err := tx.Run(fmt.Sprintf(`
		OPTIONAL MATCH (n:Bulk%s{node_id:$node_id})
		RETURN n IS NOT NULL AS Exists`,
		scan_type),
		map[string]interface{}{
			"node_id": scan_id,
		})
	if err != nil {
		return scan_ids, err
	}

	recc, err := r.Single()
	if err != nil {
		return scan_ids, err
	}

	if !recc.Values[0].(bool) {
		return scan_ids, &NodeNotFoundError{
			node_id: scan_id,
		}
	}

	neo_res, err := tx.Run(`
		MATCH (m:Bulk`+string(scan_type)+`{node_id:$scan_id}) -[:BATCH]-> (d:`+string(scan_type)+`) -[:SCANNED]-> (n)
		RETURN d.node_id as scan_id, d.status, d.status_message, n.node_id as node_id, n.node_name, labels(n) as node_type, d.updated_at`,
		map[string]interface{}{"scan_id": scan_id})
	if err != nil {
		return scan_ids, err
	}

	recs, err := neo_res.Collect()
	if err != nil {
		return scan_ids, reporters.NotFoundErr
	}

	return model.ScanStatusResp{
		Statuses: extractStatuses(recs),
	}, nil
}

func Labels2NodeType(labels []interface{}) string {
	for i := range labels {
		str := fmt.Sprintf("%v", labels[i])
		if str == "Node" {
			return "host"
		} else if str == "ContainerImage" {
			return "image"
		} else if str == "Container" {
			return "container"
		} else if str == "KubernetesCluster" {
			return "cluster"
		} else if str == "RegistryAccount" {
			return "registry"
		} else if str == "CloudNode" {
			return "cloud_account"
		}
	}
	return "unknown"
}

func GetComplianceBulkScans(ctx context.Context, scanType utils.Neo4jScanType, scanId string) (model.ComplianceScanStatusResp, error) {
	scanIds := model.ComplianceScanStatusResp{
		Statuses: []model.ComplianceScanInfo{},
	}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msgf("Neo4j client init failed: %+v", err)
		return scanIds, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		log.Error().Msgf("Neo4j session creation failed: %+v", err)
		return scanIds, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		log.Error().Msgf("Failed to begin new neo4j transaction: %+v", err)
		return scanIds, err
	}
	defer tx.Close()

	neo_res, err := tx.Run(`
		MATCH (m:Bulk`+string(scanType)+`{node_id:$scan_id}) -[:BATCH]-> (d:`+string(scanType)+`) -[:SCANNED]-> (n:CloudNode)
		RETURN d.node_id, d.benchmark_types, d.status, d.status_message, n.node_id, d.updated_at, n.node_name`,
		map[string]interface{}{"scan_id": scanId})
	if err != nil {
		log.Error().Msgf("Compliance bulk scans status query failed: %+v", err)
		return scanIds, err
	}

	recs, err := neo_res.Collect()
	if err != nil {
		log.Error().Msgf("Compliance bulk scan neo4j result collection failed: %+v", err)
		return scanIds, err
	}

	return model.ComplianceScanStatusResp{
		Statuses: extractStatusesWithBenchmarks(recs),
	}, nil
}
