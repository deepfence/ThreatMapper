package reporters

import (
	"context"
	"fmt"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
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

	tx, err := session.BeginTransaction()
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
		MATCH (m:%s) -> (n)
		WHERE m.node_id IN $scan_ids
		RETURN m.node_id, m.status, n.node_id, n.node_type, m.updated_at`, scan_type),
		map[string]interface{}{"scan_ids": scan_ids})
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	recs, err := res.Collect()
	if err != nil {
		return model.ScanStatusResp{}, NotFoundErr
	}

	statuses := map[string]model.ScanInfo{}
	for _, rec := range recs {
		info := model.ScanInfo{
			ScanId:    rec.Values[0].(string),
			Status:    rec.Values[1].(string),
			NodeId:    rec.Values[2].(string),
			NodeType:  rec.Values[3].(string),
			UpdatedAt: rec.Values[4].(int64),
		}
		statuses[rec.Values[0].(string)] = info
	}

	return model.ScanStatusResp{Statuses: statuses}, nil
}

func GetComplianceScanStatus(ctx context.Context, scanType utils.Neo4jScanType, scanIds []string) (model.ComplianceScanStatusResp, error) {
	scanResponse := model.ComplianceScanStatusResp{
		Statuses: []model.ComplianceScanStatus{},
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

	tx, err := session.BeginTransaction()
	if err != nil {
		return scanResponse, err
	}
	defer tx.Close()

	res, err := tx.Run(fmt.Sprintf(`
		MATCH (m:%s)
		WHERE m.node_id IN $scan_ids
		RETURN m.node_id, m.benchmark_type, m.status`, scanType),
		map[string]interface{}{"scan_ids": scanIds})
	if err != nil {
		return scanResponse, err
	}

	recs, err := res.Collect()
	if err != nil {
		return scanResponse, err
	}

	for _, rec := range recs {
		tmp := model.ComplianceScanStatus{
			ScanId:        rec.Values[0].(string),
			BenchmarkType: rec.Values[1].(string),
			Status:        rec.Values[2].(string),
		}
		scanResponse.Statuses = append(scanResponse.Statuses, tmp)
	}

	return scanResponse, nil
}

func NodeIdentifierToIdList(in []model.NodeIdentifier) []string {
	res := []string{}
	for i := range in {
		res = append(res, in[i].NodeId)
	}
	return res
}

func GetRegisteriesImageIDs(ctx context.Context, registryIds []model.NodeIdentifier) ([]model.NodeIdentifier, error) {
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

	tx, err := session.BeginTransaction()
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

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	nres, err := tx.Run(`
		MATCH (m:KubernetesCluster)
		WHERE m.node_id IN $node_ids
		MATCH (m) -[:INSTANCIATE]-> (n:Host)
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

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	nres, err := tx.Run(`
		MATCH (m:KubernetesCluster)
		WHERE m.node_id IN $node_ids
		MATCH (m) -[:INSTANCIATE]-> (n:Host)
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

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	nres, err := tx.Run(`
		MATCH (m:KubernetesCluster)
		WHERE m.node_id IN $node_ids
		MATCH (m) -[:INSTANCIATE]-> (n:Host)
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
			NodeType: "host",
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

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	nres, err := tx.Run(`
		MATCH (n:Node)
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

func GetScansList(ctx context.Context,
	scan_type utils.Neo4jScanType,
	node_id string,
	node_type controls.ScanResource,
	fw model.FetchWindow) (model.ScanListResp, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return model.ScanListResp{}, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return model.ScanListResp{}, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return model.ScanListResp{}, err
	}
	defer tx.Close()

	res, err := tx.Run(`
		MATCH (m:`+string(scan_type)+`) -[:SCANNED]-> (:`+controls.ResourceTypeToNeo4j(node_type)+`{node_id: $node_id})
		RETURN m.node_id, m.status, m.updated_at
		ORDER BY m.updated_at
		SKIP $skip
		LIMIT $limit`,
		map[string]interface{}{"node_id": node_id, "skip": fw.Offset, "limit": fw.Size})
	if err != nil {
		return model.ScanListResp{}, err
	}

	recs, err := res.Collect()
	if err != nil {
		return model.ScanListResp{}, NotFoundErr
	}

	scans_info := []model.ScanInfo{}
	for _, rec := range recs {
		tmp := model.ScanInfo{
			ScanId:    rec.Values[0].(string),
			Status:    rec.Values[1].(string),
			UpdatedAt: rec.Values[2].(int64),
		}
		scans_info = append(scans_info, tmp)
	}

	return model.ScanListResp{ScansInfo: scans_info}, nil
}

func GetCloudCompliancePendingScansList(ctx context.Context, scan_type utils.Neo4jScanType, node_id string) (model.CloudComplianceScanListResp, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}
	defer tx.Close()

	res, err := tx.Run(`
		MATCH (m:`+string(scan_type)+`) -[:SCANNED]-> (:Node{node_id: $node_id})
		WHERE NOT m.status = $complete AND NOT m.status = $failed AND NOT m.status = $in_progress
		RETURN m.node_id, m.benchmark_type, m.status, m.updated_at ORDER BY m.updated_at`,
		map[string]interface{}{"node_id": node_id, "complete": utils.SCAN_STATUS_SUCCESS, "failed": utils.SCAN_STATUS_FAILED, "in_progress": utils.SCAN_STATUS_INPROGRESS})
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}

	recs, err := res.Collect()
	if err != nil {
		return model.CloudComplianceScanListResp{}, err
	}

	scans_info := []model.CloudComplianceScanInfo{}
	for _, rec := range recs {
		tmp := model.CloudComplianceScanInfo{
			ScanId:        rec.Values[0].(string),
			BenchmarkType: rec.Values[1].(string),
			Status:        rec.Values[2].(string),
			UpdatedAt:     rec.Values[3].(int64),
		}
		scans_info = append(scans_info, tmp)
	}

	return model.CloudComplianceScanListResp{ScansInfo: scans_info}, nil
}

func GetScanResults[T any](ctx context.Context, scan_type utils.Neo4jScanType, scan_id string, fw model.FetchWindow) ([]T, model.ScanResultsCommon, error) {
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

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, common, err
	}
	defer tx.Close()

	r, err := tx.Run(fmt.Sprintf(`
		OPTIONAL MATCH (n:%s{node_id:$node_id})
		RETURN n IS NOT NULL AS Exists`,
		scan_type),
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

	nres, err := tx.Run(`
		MATCH (m:`+string(scan_type)+`{node_id: $scan_id}) -[:DETECTED]-> (d)
		RETURN d
		SKIP $skip
		LIMIT $limit`,
		map[string]interface{}{"scan_id": scan_id, "skip": fw.Offset, "limit": fw.Size})
	if err != nil {
		return res, common, err
	}

	recs, err := nres.Collect()
	if err != nil {
		return res, common, err
	}

	for _, rec := range recs {
		var tmp T
		utils.FromMap(rec.Values[0].(neo4j.Node).Props, &tmp)
		res = append(res, tmp)
	}

	ncommonres, err := tx.Run(`
		MATCH (m:`+string(scan_type)+`{node_id: $scan_id}) -[:SCANNED]-> (n)
		RETURN n`,
		map[string]interface{}{"scan_id": scan_id})
	if err != nil {
		return res, common, err
	}

	rec, err = ncommonres.Single()
	if err != nil {
		return res, common, err
	}

	utils.FromMap(rec.Values[0].(neo4j.Node).Props, &common)

	return res, common, nil
}

func type2sev_field(scan_type utils.Neo4jScanType) string {
	switch scan_type {
	case utils.NEO4J_VULNERABILITY_SCAN:
		return "cve_severity"
	case utils.NEO4J_SECRET_SCAN:
		return "level"
	case utils.NEO4J_MALWARE_SCAN:
		return "FileSeverity"
	}
	return "error_sev_field_unknown"
}

func GetSevCounts(ctx context.Context, scan_type utils.Neo4jScanType, scan_id string) (map[string]int, error) {
	res := map[string]int{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	nres, err := tx.Run(`
		MATCH (m:`+string(scan_type)+`{node_id: $scan_id}) -[:DETECTED]-> (d)
		RETURN d.`+type2sev_field(scan_type),
		map[string]interface{}{"scan_id": scan_id})
	if err != nil {
		return res, err
	}

	recs, err := nres.Collect()
	if err != nil {
		return res, err
	}

	for i := range recs {
		res[recs[i].Values[0].(string)] += 1
	}

	return res, nil
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

	tx, err := session.BeginTransaction()
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
		RETURN d.node_id as scan_id, d.status as status, n.node_id as node_id, n.node_type as node_type, d.updated_at`,
		map[string]interface{}{"scan_id": scan_id})
	if err != nil {
		return scan_ids, err
	}

	recs, err := neo_res.Collect()
	if err != nil {
		return scan_ids, NotFoundErr
	}

	for _, rec := range recs {
		info := model.ScanInfo{
			ScanId:    rec.Values[0].(string),
			Status:    rec.Values[1].(string),
			NodeId:    rec.Values[2].(string),
			NodeType:  rec.Values[3].(string),
			UpdatedAt: rec.Values[4].(int64),
		}
		scan_ids.Statuses[rec.Values[0].(string)] = info
	}

	return scan_ids, nil
}

func GetComplianceBulkScans(ctx context.Context, scanType utils.Neo4jScanType, scanId string) (model.ComplianceScanStatusResp, error) {
	scanIds := model.ComplianceScanStatusResp{
		Statuses: []model.ComplianceScanStatus{},
	}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return scanIds, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return scanIds, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return scanIds, err
	}
	defer tx.Close()

	neo_res, err := tx.Run(`
		MATCH (m:Bulk`+string(scanType)+`{node_id:$scan_id}) -[:BATCH]-> (d:`+string(scanType)+`)
		RETURN d.node_id, d.benchmark_type, d.status`,
		map[string]interface{}{"scan_id": scanId})
	if err != nil {
		return scanIds, err
	}

	recs, err := neo_res.Collect()
	if err != nil {
		return scanIds, err
	}

	for _, rec := range recs {
		tmp := model.ComplianceScanStatus{
			ScanId:        rec.Values[0].(string),
			BenchmarkType: rec.Values[1].(string),
			Status:        rec.Values[2].(string),
		}
		scanIds.Statuses = append(scanIds.Statuses, tmp)
	}

	return scanIds, nil
}
