package reporters

import (
	"context"
	"fmt"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func GetScanStatus(ctx context.Context, scan_type utils.Neo4jScanType, scan_id string) (model.ScanStatusResp, error) {
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

	res, err := tx.Run(fmt.Sprintf("MATCH (m:%s{node_id: $scan_id}) RETURN m.status", scan_type),
		map[string]interface{}{"scan_id": scan_id})
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	rec, err := res.Single()
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	return model.ScanStatusResp{Status: model.ScanStatus(rec.Values[0].(string))}, nil
}

func GetScansList(ctx context.Context, scan_type utils.Neo4jScanType, node_id string, fw model.FetchWindow) (model.ScanListResp, error) {
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

	res, err := tx.Run(`MATCH (m:`+string(scan_type)+`) -[:SCANNED]-> (:Node{node_id: $node_id}) RETURN m.node_id, m.status, m.updated_at ORDER BY m.updated_at SKIP $skip LIMIT $limit`,
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

func GetScanResults(ctx context.Context, scan_type utils.Neo4jScanType, scan_id string, fw model.FetchWindow) (model.ScanResultsResp, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return model.ScanResultsResp{}, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return model.ScanResultsResp{}, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return model.ScanResultsResp{}, err
	}
	defer tx.Close()

	res, err := tx.Run(`MATCH (m:`+string(scan_type)+`{node_id: $scan_id}) -[:DETECTED]-> (d) RETURN d SKIP $skip LIMIT $limit`,
		map[string]interface{}{"scan_id": scan_id, "skip": fw.Offset, "limit": fw.Size})
	if err != nil {
		return model.ScanResultsResp{}, err
	}

	recs, err := res.Collect()
	if err != nil {
		return model.ScanResultsResp{}, err
	}

	scan_result := []map[string]interface{}{}
	for _, rec := range recs {
		tmp := map[string]interface{}{}
		for i, key := range rec.Keys {
			tmp[key] = rec.Values[i]
		}
		scan_result = append(scan_result, tmp)
	}

	return model.ScanResultsResp{Results: scan_result}, nil
}
