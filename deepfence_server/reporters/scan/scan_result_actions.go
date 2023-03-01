package reporters_scan

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
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

	tx, err := session.BeginTransaction()
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

	tx, err := session.BeginTransaction()
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

func DeleteScanResult(ctx context.Context, scanType utils.Neo4jScanType, scanId string, docIds []string) error {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
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
	tx2, err := session.BeginTransaction()
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
		tx3, err := session.BeginTransaction()
		if err != nil {
			return err
		}
		defer tx3.Close()
		_, err = tx3.Run(`
			MATCH (n:`+reporters.ScanResultMaskNode[scanType]+`) 
			WHERE not (n)<-[:IS]-(:`+string(scanType)+`)
			DETACH DELETE (n)`, map[string]interface{}{})
		if err != nil {
			return err
		}
		err = tx3.Commit()
		if err != nil {
			return err
		}
	}
	return nil
}

func NotifyScanResult(ctx context.Context, scanType utils.Neo4jScanType, scanId string, scanIDs []string) error {
	return nil
}
