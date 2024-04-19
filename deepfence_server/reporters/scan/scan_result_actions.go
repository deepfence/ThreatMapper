package reporters_scan //nolint:stylecheck

import (
	"context"
	"fmt"
	"path"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func UpdateScanResultNodeFields(ctx context.Context, scanType utils.Neo4jScanType, scanID string, nodeIDs []string, key, value string) error {
	// (m:VulnerabilityScan) - [r:DETECTED] -> (n:Cve)
	// update fields of "Cve" node
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

	_, err = tx.Run(ctx, `
		MATCH (m:`+string(scanType)+`) -[r:DETECTED]-> (n)
		WHERE n.node_id IN $node_ids AND m.node_id = $scan_id
		SET n.`+key+` = $value`, map[string]interface{}{"node_ids": nodeIDs, "value": value, "scan_id": scanID})
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func UpdateScanResultMasked(ctx context.Context, req *model.ScanResultsMaskRequest, value bool) error {
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

	switch req.MaskAction {
	case utils.MaskGlobal:
		nodeTag := utils.ScanTypeDetectedNode[utils.Neo4jScanType(req.ScanType)]
		globalQuery := `
        MATCH (o:` + nodeTag + `) -[:IS]-> (r)
        WHERE o.node_id IN $node_ids
        MATCH (n:` + nodeTag + `) -[:IS]-> (r)
        MATCH (s) - [d:DETECTED] -> (n)
        SET r.masked = $value, n.masked = $value, d.masked = $value
        WITH s, n
        MATCH (s) -[:SCANNED] ->(e)
        MATCH (c:ContainerImage{node_id: e.docker_image_id}) -[:ALIAS] ->(t)
        MERGE (t) -[m:MASKED]->(n)
        SET m.masked = $value
		WITH c,n
		MATCH (c) -[:IS] ->(ist)
		%s`

		imageStubQuery := ""
		if value {
			imageStubQuery = `MERGE (ist) -[ma:MASKED]-> (n) SET ma.masked = true`
		} else {
			imageStubQuery = `MATCH(ist) -[ma:MASKED] -> (n) DELETE ma`
		}

		globalQuery = fmt.Sprintf(globalQuery, imageStubQuery)

		if utils.Neo4jScanType(req.ScanType) == utils.NEO4JCloudComplianceScan {
			globalQuery = `
			MATCH (o:CloudCompliance)
			WHERE o.node_id IN $node_ids
			WITH distinct(o.full_control_id) as control_ids
				MATCH (n:CloudCompliance) <-[d:DETECTED]- (s:CloudComplianceScan)
				WHERE n.full_control_id IN control_ids
				SET n.masked=$value, d.masked=$value
			WITH control_ids
				MATCH (c:CloudComplianceControl)
				WHERE c.control_id IN control_ids
				SET c.active=$active
			`
		}

		log.Debug().Msgf("mask_global query: %s", globalQuery)

		_, err = tx.Run(ctx, globalQuery, map[string]interface{}{"node_ids": req.ResultIDs, "value": value, "active": !value})

	case utils.MaskAllImageTag:
		entityQuery := `
        MATCH (s:` + string(req.ScanType) + `) - [d:DETECTED] -> (n)
        WHERE n.node_id IN $node_ids
		WITH s, n, d
		MATCH (s) -[:SCANNED]-> (c:ContainerImage) -[:ALIAS] ->(t) -[m:MASKED]-> (n)
		WITH s, n, d, m, c
		MATCH (c)-[:IS]->(ist)
		SET d.masked=$value, m.masked=$value
		WITH ist, n
		%s`

		imageStubQuery := ""
		if value {
			imageStubQuery = `MERGE (ist) -[ma:MASKED]-> (n) SET ma.masked = true`
		} else {
			imageStubQuery = `MATCH(ist) -[ma:MASKED] -> (n) DELETE ma`
		}

		entityQuery = fmt.Sprintf(entityQuery, imageStubQuery)
		log.Debug().Msgf("mask_all_image_tag query: %s", entityQuery)
		_, err = tx.Run(ctx, entityQuery, map[string]interface{}{"node_ids": req.ResultIDs,
			"value": value, "scan_id": req.ScanID})

	case utils.MaskEntity:
		entityQuery := `
        MATCH (s:` + string(req.ScanType) + `) - [d:DETECTED] -> (n)
        WHERE n.node_id IN $node_ids
        SET n.masked = $value, d.masked = $value`

		log.Debug().Msgf("mask_entity query: %s", entityQuery)

		_, err = tx.Run(ctx, entityQuery, map[string]interface{}{"node_ids": req.ResultIDs, "value": value})

	case utils.MaskImageTag:
		maskImageTagQuery := `
        MATCH (s:` + string(req.ScanType) + `) -[d:DETECTED] -> (n)
        WHERE n.node_id IN $node_ids AND s.node_id=$scan_id
        MATCH (s) -[:SCANNED] ->(e)
        MATCH (c:ContainerImage{node_id: e.docker_image_id}) -[:ALIAS] ->(t)
        MERGE (t) -[m:MASKED]->(n)
        SET m.masked = $value, d.masked = $value`

		log.Debug().Msgf("mask_image_tag query: %s", maskImageTagQuery)

		_, err = tx.Run(ctx, maskImageTagQuery,
			map[string]interface{}{"node_ids": req.ResultIDs, "value": value, "scan_id": req.ScanID})

	default:
		defaultMaskQuery := `
        MATCH (m:` + string(req.ScanType) + `) -[d:DETECTED] -> (n)
        WHERE n.node_id IN $node_ids AND m.node_id=$scan_id
        SET d.masked = $value`

		log.Debug().Msgf("mask_image_tag query: %s", defaultMaskQuery)

		_, err = tx.Run(ctx, defaultMaskQuery,
			map[string]interface{}{"node_ids": req.ResultIDs, "value": value, "scan_id": req.ScanID})

	}

	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// DeleteScanResults Delete selected scan results (cves, secrets, etc)
func DeleteScanResults(ctx context.Context, scanType utils.Neo4jScanType, scanID string, nodeIDs []string) error {
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

	_, err = tx.Run(ctx, `
		MATCH (m:`+string(scanType)+`) -[r:DETECTED]-> (n)
		WHERE n.node_id IN $node_ids AND m.node_id = $scan_id
		DELETE r`, map[string]interface{}{"node_ids": nodeIDs, "scan_id": scanID})
	if err != nil {
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		return err
	}

	tx2, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx2.Close(ctx)

	// Delete results which are not part of any scans now
	_, err = tx2.Run(ctx,
		`MATCH (n:`+utils.ScanTypeDetectedNode[scanType]+`)
		WHERE not (n)<-[:DETECTED]-(:`+string(scanType)+`)
		DETACH DELETE (n)`, map[string]interface{}{})
	if err != nil {
		return err
	}
	err = tx2.Commit(ctx)
	if err != nil {
		return err
	}

	return nil
}

func getScanNodeID(ctx context.Context, res neo4j.ResultWithContext) (nodeID string, nodeType string, err error) {
	rec, err := res.Single(ctx)
	if err != nil {
		return "", "", err
	}
	if rec.Values[0] != nil && rec.Values[1] != nil {
		return rec.Values[0].(string), rec.Values[1].(string), nil
	}
	return "", "", nil
}

// DeleteScan Delete entire scan
func DeleteScan(ctx context.Context, scanType utils.Neo4jScanType, scanID string) error {
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

	res, err := tx.Run(ctx, `
		MATCH (m:`+string(scanType)+`{node_id: $scan_id})-[:SCANNED]-> (n)
		RETURN n.node_id, n.node_type`, map[string]interface{}{"scan_id": scanID})
	if err != nil {
		return err
	}
	nodeID, nodeType, err := getScanNodeID(ctx, res)
	if err != nil {
		// This error can be ignored
		log.Warn().Msg(err.Error())
	}

	_, err = tx.Run(ctx, `
		MATCH (m:`+string(scanType)+`{node_id: $scan_id})
		OPTIONAL MATCH (m)-[r:DETECTED]-> (n:`+utils.ScanTypeDetectedNode[scanType]+`)
		DETACH DELETE m,r`, map[string]interface{}{"scan_id": scanID})
	if err != nil {
		return err
	}
	err = tx.Commit(ctx)
	if err != nil {
		return err
	}

	tx2, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx2.Close(ctx)

	// Delete results which are not part of any scans now
	_, err = tx2.Run(ctx,
		`MATCH (n:`+utils.ScanTypeDetectedNode[scanType]+`)
		WHERE not (n)<-[:DETECTED]-(:`+string(scanType)+`)
		DETACH DELETE (n)`, map[string]interface{}{})
	if err != nil {
		return err
	}
	err = tx2.Commit(ctx)
	if err != nil {
		return err
	}

	// Reset node's latest_scan_id to the previous scan id, if any
	if nodeID != "" && nodeType != "" {
		latestScanIDField := ingestersUtil.LatestScanIDField[scanType]
		scanStatusField := ingestersUtil.ScanStatusField[scanType]
		scanCountField := ingestersUtil.ScanCountField[scanType]

		query := `MATCH (m:` + nodeType2Neo4jType(nodeType) + `{node_id:"` + nodeID + `"})
		SET m.` + latestScanIDField + `="", m.` + scanCountField + `=0, m.` + scanStatusField + `=""
		WITH m
		OPTIONAL MATCH (s:` + string(scanType) + `) - [:SCANNED] -> (m)
		WITH max(s.updated_at) as most_recent
		MATCH (m) <-[:SCANNED]- (s:` + string(scanType) + `{updated_at: most_recent})-[:DETECTED]->(c:` + utils.ScanTypeDetectedNode[scanType] + `)
		WITH s, m, count(distinct c) as scan_count
		SET m.` + latestScanIDField + `=s.node_id, m.` + scanCountField + `=scan_count, m.` + scanStatusField + `=s.status`

		log.Debug().Msgf("Query to reset scan status: %v", query)

		tx4, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
		if err != nil {
			return err
		}
		defer tx4.Close(ctx)

		_, err = tx4.Run(ctx, query, map[string]interface{}{})
		if err != nil {
			return err
		}
		err = tx4.Commit(ctx)
		if err != nil {
			return err
		}
	}

	if scanType == utils.NEO4JVulnerabilityScan {
		mc, err := directory.FileServerClient(ctx)
		if err != nil {
			log.Error().Err(err).Msg("failed to get minio client")
			return err
		}
		sbomFile := path.Join("/sbom", utils.ScanIDReplacer.Replace(scanID)+".json.gz")
		err = mc.DeleteFile(ctx, sbomFile, true, minio.RemoveObjectOptions{ForceDelete: true})
		if err != nil {
			log.Error().Err(err).Msgf("failed to delete sbom for scan id %s", scanID)
			return err
		}
		runtimeSbomFile := path.Join("/sbom", "runtime-"+utils.ScanIDReplacer.Replace(scanID)+".json")
		err = mc.DeleteFile(ctx, runtimeSbomFile, true, minio.RemoveObjectOptions{ForceDelete: true})
		if err != nil {
			log.Error().Err(err).Msgf("failed to delete runtime sbom for scan id %s", scanID)
			return err
		}
	}

	return nil
}

func MarkScanDeletePending(ctx context.Context, scanType utils.Neo4jScanType,
	scanIds []string) error {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(15*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	query := `MATCH (n:%s) -[:SCANNED]-> (m)
			WHERE n.node_id IN $scan_ids
			SET n.status = $delete_pending`

	queryStr := fmt.Sprintf(query, string(scanType))

	log.Debug().Msgf("Query: %s", queryStr)

	if _, err = tx.Run(ctx, queryStr,
		map[string]interface{}{
			"scan_ids":       scanIds,
			"delete_pending": utils.ScanStatusDeletePending,
		}); err != nil {
		log.Error().Msgf("Failed to mark scans as DELETE_PENDING, Error: %s", err.Error())
		return err
	}
	return tx.Commit(ctx)
}

func StopCloudComplianceScan(ctx context.Context, scanIds []string) error {

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(15*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	query := `MATCH (n:CloudComplianceScan{node_id: $scan_id}) -[:SCANNED]-> ()
        WHERE n.status = $in_progress
        SET n.status = $cancel_pending`

	for _, scanid := range scanIds {
		if _, err = tx.Run(ctx, query,
			map[string]interface{}{
				"scan_id":        scanid,
				"in_progress":    utils.ScanStatusInProgress,
				"cancel_pending": utils.ScanStatusCancelPending,
			}); err != nil {
			log.Error().Msgf("StopCloudComplianceScan: Error in setting the state in neo4j: %v", err)
			return err
		}
	}

	return tx.Commit(ctx)
}

func StopScan(ctx context.Context, scanType string, scanIds []string) error {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)
	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(15*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	nodeStatusField := ingestersUtil.ScanStatusField[utils.Neo4jScanType(scanType)]

	query := `MATCH (n:%s{node_id: $scan_id}) -[:SCANNED]-> (m)
			WHERE n.status IN [$starting, $in_progress]
			WITH n,m                
			SET n.status = CASE WHEN n.status = $starting THEN $cancelled 
			ELSE $cancel_pending END, 
			m.%s = n.status`

	queryStr := fmt.Sprintf(query, scanType, nodeStatusField)
	for _, scanid := range scanIds {
		if _, err = tx.Run(ctx, queryStr,
			map[string]interface{}{
				"scan_id":        scanid,
				"starting":       utils.ScanStatusStarting,
				"in_progress":    utils.ScanStatusInProgress,
				"cancel_pending": utils.ScanStatusCancelPending,
				"cancelled":      utils.ScanStatusCancelled,
			}); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func NotifyScanResult(ctx context.Context, scanType utils.Neo4jScanType, scanID string, scanIDs []string, integrationIDs []int32) error {
	switch scanType {
	case utils.NEO4JVulnerabilityScan:
		res, common, err := GetSelectedScanResults[model.Vulnerability](ctx, scanType, scanID, scanIDs)
		if err != nil {
			return err
		}
		if err := Notify[model.Vulnerability](ctx, res, common, string(scanType), integrationIDs); err != nil {
			return err
		}
	case utils.NEO4JSecretScan:
		res, common, err := GetSelectedScanResults[model.Secret](ctx, scanType, scanID, scanIDs)
		if err != nil {
			return err
		}
		if err := Notify[model.Secret](ctx, res, common, string(scanType), integrationIDs); err != nil {
			return err
		}
	case utils.NEO4JMalwareScan:
		res, common, err := GetSelectedScanResults[model.Malware](ctx, scanType, scanID, scanIDs)
		if err != nil {
			return err
		}
		if err := Notify[model.Malware](ctx, res, common, string(scanType), integrationIDs); err != nil {
			return err
		}
	case utils.NEO4JComplianceScan:
		res, common, err := GetSelectedScanResults[model.Compliance](ctx, scanType, scanID, scanIDs)
		if err != nil {
			return err
		}
		if err := Notify[model.Compliance](ctx, res, common, string(scanType), integrationIDs); err != nil {
			return err
		}
	case utils.NEO4JCloudComplianceScan:
		res, common, err := GetSelectedScanResults[model.CloudCompliance](ctx, scanType, scanID, scanIDs)
		if err != nil {
			return err
		}
		if err := Notify[model.CloudCompliance](ctx, res, common, string(scanType), integrationIDs); err != nil {
			return err
		}
	}

	return nil
}

func GetSelectedScanResults[T any](ctx context.Context, scanType utils.Neo4jScanType, scanID string, scanIDs []string) ([]T, model.ScanResultsCommon, error) {
	res := []T{}
	common := model.ScanResultsCommon{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, common, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(15*time.Second))
	if err != nil {
		return res, common, err
	}
	defer tx.Close(ctx)

	query := `MATCH (n:%s) -[:DETECTED]-> (m)
		WHERE m.node_id IN $scan_ids
		AND n.node_id = $scan_id
		RETURN m{.*}`

	result, err := tx.Run(ctx, fmt.Sprintf(query, scanType), map[string]interface{}{"scan_ids": scanIDs, "scan_id": scanID})
	if err != nil {
		log.Error().Msgf("NotifyScanResult: Error in getting the scan result nodes from neo4j: %v", err)
		return res, common, err
	}

	recs, err := result.Collect(ctx)
	if err != nil {
		log.Error().Msgf("NotifyScanResult: Error in collecting the scan result nodes from neo4j: %v", err)
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

	rec, err := ncommonres.Single(ctx)
	if err != nil {
		return res, common, err
	}

	utils.FromMap(rec.Values[0].(map[string]interface{}), &common)

	return res, common, err
}
