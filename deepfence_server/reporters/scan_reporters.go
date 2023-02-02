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

	res, err := tx.Run(fmt.Sprintf(`
		MATCH (m:%s)
		WHERE m.node_id IN $scan_ids
		RETURN m.node_id, m.status`, scan_type),
		map[string]interface{}{"scan_ids": scan_ids})
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	recs, err := res.Collect()
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	statuses := map[string]model.ScanStatus{}
	for i := range recs {
		statuses[recs[i].Values[0].(string)] = model.ScanStatus(recs[i].Values[1].(string))
	}

	return model.ScanStatusResp{Statuses: statuses}, nil
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
		return model.ScanListResp{}, err
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

func GetPendingScansList(ctx context.Context, scan_type utils.Neo4jScanType, node_id string) (model.ScanListResp, error) {
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
		MATCH (m:`+string(scan_type)+`) -[:SCANNED]-> (:Node{node_id: $node_id})
		WHERE NOT m.status = $complete AND NOT m.status = $failed AND NOT m.status = $in_progress
		RETURN m.node_id, m.status, m.updated_at ORDER BY m.updated_at`,
		map[string]interface{}{"node_id": node_id, "complete": utils.SCAN_STATUS_SUCCESS, "failed": utils.SCAN_STATUS_FAILED, "in_progress": utils.SCAN_STATUS_INPROGRESS})
	if err != nil {
		return model.ScanListResp{}, err
	}

	recs, err := res.Collect()
	if err != nil {
		return model.ScanListResp{}, err
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

	return res, common, nil
}

func type2sev_field(scan_type utils.Neo4jScanType) string {
	switch scan_type {
	case utils.NEO4J_VULNERABILITY_SCAN:
		return "cve_severity"
	case utils.NEO4J_SECRET_SCAN:
		return "level"
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
		Statuses: map[string]model.ScanStatus{},
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

	neo_res, err := tx.Run(`
		MATCH (m:Bulk`+string(scan_type)+`{node_id:$scan_id}) -[:BATCH]-> (d:`+string(scan_type)+`)
		RETURN d.node_id, d.status`,
		map[string]interface{}{"scan_id": scan_id})
	if err != nil {
		return scan_ids, err
	}

	recs, err := neo_res.Collect()
	if err != nil {
		return scan_ids, err
	}

	for _, rec := range recs {
		scan_ids.Statuses[rec.Values[0].(string)] = model.ScanStatus(rec.Values[1].(string))
	}

	return scan_ids, nil
}
