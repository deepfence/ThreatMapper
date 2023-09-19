package reporters_scan

import (
	"context"
	"fmt"
	"path"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func UpdateScanResultNodeFields(ctx context.Context, scanType utils.Neo4jScanType, scanId string, nodeIds []string, key, value string) error {
	// (m:VulnerabilityScan) - [r:DETECTED] -> (n:Cve)
	// update fields of "Cve" node
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
		MATCH (m:`+string(scanType)+`) -[r:DETECTED]-> (n)
		WHERE n.node_id IN $node_ids AND m.node_id = $scan_id
		SET n.`+key+` = $value`, map[string]interface{}{"node_ids": nodeIds, "value": value, "scan_id": scanId})
	if err != nil {
		return err
	}
	return tx.Commit()
}

func UpdateScanResultMasked(ctx context.Context, req *model.ScanResultsMaskRequest, value bool) error {
	// (m:VulnerabilityScan) - [r:DETECTED] -> (n:Cve)
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

	if req.MaskAcrossHostsAndImages {
		_, err = tx.Run(`
		MATCH (n:`+reporters.ScanResultMaskNode[utils.Neo4jScanType(req.ScanType)]+`)
		WHERE n.node_id IN $node_ids
		SET n.masked = $value`, map[string]interface{}{"node_ids": req.ResultIDs, "value": value})
	} else {
		_, err = tx.Run(`
		MATCH (m:`+string(req.ScanType)+`) -[:DETECTED] -> (n)
		WHERE n.node_id IN $node_ids
		SET n.masked = $value`, map[string]interface{}{"node_ids": req.ResultIDs, "value": value})
	}
	if err != nil {
		return err
	}
	return tx.Commit()
}

func DeleteScan(ctx context.Context, scanType utils.Neo4jScanType, scanId string, docIds []string) error {
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

	if len(docIds) > 0 {
		_, err = tx.Run(`
		MATCH (m:`+string(scanType)+`) -[r:DETECTED]-> (n)
		WHERE n.node_id IN $node_ids AND m.node_id = $scan_id
		DELETE r`, map[string]interface{}{"node_ids": docIds, "scan_id": scanId})
		if err != nil {
			return err
		}
	} else {
		_, err = tx.Run(`
		MATCH (m:`+string(scanType)+`{node_id: $scan_id})
		OPTIONAL MATCH (m)-[r:DETECTED]-> (n:`+utils.ScanTypeDetectedNode[scanType]+`)
		DETACH DELETE m,r`, map[string]interface{}{"scan_id": scanId})
		if err != nil {
			return err
		}
	}
	err = tx.Commit()
	if err != nil {
		return err
	}
	tx2, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx2.Close()
	// Delete results which are not part of any scans now
	_, err = tx2.Run(`
		MATCH (n:`+utils.ScanTypeDetectedNode[scanType]+`)
		WHERE not (n)<-[:DETECTED]-(:`+string(scanType)+`)
		DETACH DELETE (n)`, map[string]interface{}{})
	if err != nil {
		return err
	}
	err = tx2.Commit()
	if err != nil {
		return err
	}
	if scanType == utils.NEO4J_VULNERABILITY_SCAN {
		tx3, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
		if err != nil {
			return err
		}
		defer tx3.Close()
		_, err = tx3.Run(`
			MATCH (n:`+reporters.ScanResultMaskNode[scanType]+`)
			WHERE not (n)<-[:IS]-(:`+utils.ScanTypeDetectedNode[scanType]+`)
			DETACH DELETE (n)`, map[string]interface{}{})
		if err != nil {
			return err
		}
		err = tx3.Commit()
		if err != nil {
			return err
		}

		// remove sbom
		mc, err := directory.MinioClient(ctx)
		if err != nil {
			log.Error().Err(err).Msg("failed to get minio client")
			return err
		}
		sbomFile := path.Join("sbom", utils.ScanIdReplacer.Replace(scanId)+".json.gz")
		err = mc.DeleteFile(ctx, sbomFile, true, minio.RemoveObjectOptions{ForceDelete: true})
		if err != nil {
			log.Error().Err(err).Msgf("failed to delete sbom for scan id %s", scanId)
			return err
		}
		runtimeSbomFile := path.Join("sbom", "runtime-"+utils.ScanIdReplacer.Replace(scanId)+".json")
		err = mc.DeleteFile(ctx, runtimeSbomFile, true, minio.RemoveObjectOptions{ForceDelete: true})
		if err != nil {
			log.Error().Err(err).Msgf("failed to delete runtime sbom for scan id %s", scanId)
			return err
		}
	}

	// update nodes scan result
	query := ""
	switch scanType {
	case utils.NEO4J_VULNERABILITY_SCAN:
		query = `MATCH (n)
		WHERE (n:Node OR n:Container or n:ContainerImage)
		AND n.vulnerability_latest_scan_id="%s"
		SET n.vulnerability_latest_scan_id="", n.vulnerabilities_count=0, n.vulnerability_scan_status=""`
	case utils.NEO4J_SECRET_SCAN:
		query = `MATCH (n)
		WHERE (n:Node OR n:Container or n:ContainerImage)
		AND n.secret_latest_scan_id="%s"
		SET n.secret_latest_scan_id="", n.secrets_count=0, n.secret_scan_status=""`
	case utils.NEO4J_MALWARE_SCAN:
		query = `MATCH (n)
		WHERE (n:Node OR n:Container or n:ContainerImage)
		AND n.malware_latest_scan_id="%s"
		SET n.malware_latest_scan_id="", n.malwares_count=0, n.malware_scan_status=""`
	case utils.NEO4J_COMPLIANCE_SCAN:
		query = `MATCH (n)
		WHERE (n:Node OR n:KubernetesCluster)
		AND n.compliance_latest_scan_id="%s"
		SET n.compliance_latest_scan_id="", n.compliances_count=0, n.compliance_scan_status=""`
	case utils.NEO4J_CLOUD_COMPLIANCE_SCAN:
		query = `MATCH (n)
		WHERE (n:CloudResource)
		AND n.cloud_compliance_latest_scan_id="%s"
		SET n.cloud_compliance_latest_scan_id="", n.cloud_compliances_count=0, n.cloud_compliance_scan_status=""`
	}

	if len(query) < 1 {
		return nil
	}

	tx4, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx4.Close()
	_, err = tx4.Run(fmt.Sprintf(query, scanId), map[string]interface{}{})
	if err != nil {
		return err
	}
	err = tx4.Commit()
	if err != nil {
		return err
	}

	return nil
}

func StopCloudComplianceScan(ctx context.Context, scanType, scanId string) error {

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(15 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	query := `MATCH (n:%s) -[:SCANNED]-> ()
        WHERE n.node_id = $scan_id
        AND n.status = $in_progress
        SET n.status=$cancel_pending, n.stop_requested=true`

	if _, err = tx.Run(fmt.Sprintf(query, scanType),
		map[string]interface{}{
			"scan_id":        scanId,
			"in_progress":    utils.SCAN_STATUS_INPROGRESS,
			"cancel_pending": utils.SCAN_STATUS_CANCEL_PENDING,
		}); err != nil {
		log.Error().Msgf("StopCloudComplianceScan: Error in setting the state in neo4j: %v", err)
		return err
	}

	return tx.Commit()
}

func StopScan(ctx context.Context, scanType, scanId string) error {

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(15 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	query := `MATCH (n:%s) -[:SCANNED]-> ()
        WHERE n.node_id = $scan_id
        AND n.status IN [$starting, $in_progress]
        SET n.status=$cancel_pending, n.stop_requested=true`

	if _, err = tx.Run(fmt.Sprintf(query, scanType),
		map[string]interface{}{
			"scan_id":        scanId,
			"starting":       utils.SCAN_STATUS_STARTING,
			"in_progress":    utils.SCAN_STATUS_INPROGRESS,
			"cancel_pending": utils.SCAN_STATUS_CANCEL_PENDING,
		}); err != nil {
		log.Error().Msgf("StopScan: Error in setting the state in neo4j: %v", err)
		return err
	}

	return tx.Commit()
}

func NotifyScanResult(ctx context.Context, scanType utils.Neo4jScanType, scanId string, scanIDs []string) error {
	switch scanType {
	case utils.NEO4J_VULNERABILITY_SCAN:
		res, common, err := GetSelectedScanResults[model.Vulnerability](ctx, scanType, scanId, scanIDs)
		if err != nil {
			return err
		}
		if err := Notify[model.Vulnerability](ctx, res, common, string(scanType)); err != nil {
			return err
		}
	case utils.NEO4J_SECRET_SCAN:
		res, common, err := GetSelectedScanResults[model.Secret](ctx, scanType, scanId, scanIDs)
		if err != nil {
			return err
		}
		if err := Notify[model.Secret](ctx, res, common, string(scanType)); err != nil {
			return err
		}
	case utils.NEO4J_MALWARE_SCAN:
		res, common, err := GetSelectedScanResults[model.Malware](ctx, scanType, scanId, scanIDs)
		if err != nil {
			return err
		}
		if err := Notify[model.Malware](ctx, res, common, string(scanType)); err != nil {
			return err
		}
	case utils.NEO4J_COMPLIANCE_SCAN:
		res, common, err := GetSelectedScanResults[model.Compliance](ctx, scanType, scanId, scanIDs)
		if err != nil {
			return err
		}
		if err := Notify[model.Compliance](ctx, res, common, string(scanType)); err != nil {
			return err
		}
	case utils.NEO4J_CLOUD_COMPLIANCE_SCAN:
		res, common, err := GetSelectedScanResults[model.CloudCompliance](ctx, scanType, scanId, scanIDs)
		if err != nil {
			return err
		}
		if err := Notify[model.CloudCompliance](ctx, res, common, string(scanType)); err != nil {
			return err
		}
	}

	return nil
}

func GetSelectedScanResults[T any](ctx context.Context, scanType utils.Neo4jScanType, scanId string, scanIDs []string) ([]T, model.ScanResultsCommon, error) {
	res := []T{}
	common := model.ScanResultsCommon{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, common, err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(15 * time.Second))
	if err != nil {
		return res, common, err
	}
	defer tx.Close()

	query := `MATCH (n:%s) -[:DETECTED]-> (m)
		WHERE m.node_id IN $scan_ids
		AND n.node_id = $scan_id
		RETURN m{.*}`

	result, err := tx.Run(fmt.Sprintf(query, scanType), map[string]interface{}{"scan_ids": scanIDs, "scan_id": scanId})
	if err != nil {
		log.Error().Msgf("NotifyScanResult: Error in getting the scan result nodes from neo4j: %v", err)
		return res, common, err
	}

	recs, err := result.Collect()
	if err != nil {
		log.Error().Msgf("NotifyScanResult: Error in collecting the scan result nodes from neo4j: %v", err)
		return res, common, err
	}

	for _, rec := range recs {
		var tmp T
		utils.FromMap(rec.Values[0].(map[string]interface{}), &tmp)
		res = append(res, tmp)
	}

	ncommonres, err := tx.Run(`
	MATCH (m:`+string(scanType)+`{node_id: $scan_id}) -[:SCANNED]-> (n)
	RETURN n{.*, scan_id: m.node_id, updated_at:m.updated_at, created_at:m.created_at}`,
		map[string]interface{}{"scan_id": scanId})
	if err != nil {
		return res, common, err
	}

	rec, err := ncommonres.Single()
	if err != nil {
		return res, common, err
	}

	utils.FromMap(rec.Values[0].(map[string]interface{}), &common)

	return res, common, err
}
