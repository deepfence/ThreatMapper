package notification

import (
	"context"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func GetScans(ctx context.Context, scanTypes []string, statues []string) (model.NotificationGetScanResponse, error) {
	response := model.NotificationGetScanResponse{}
	var err error
	for _, st := range scanTypes {
		scanType := utils.DetectedNodeScanType[st]
		switch scanType {
		case utils.NEO4JVulnerabilityScan:
			response.VulnerabilityScan, err = GetScansFor(ctx, scanType, statues)
			if err != nil {
				return response, err
			}
		case utils.NEO4JSecretScan:
			response.SecretScan, err = GetScansFor(ctx, scanType, statues)
			if err != nil {
				return response, err
			}
		case utils.NEO4JMalwareScan:
			response.MalwareScan, err = GetScansFor(ctx, scanType, statues)
			if err != nil {
				return response, err
			}
		case utils.NEO4JComplianceScan:
			response.ComplianceScan, err = GetScansFor(ctx, scanType, statues)
			if err != nil {
				return response, err
			}
		case utils.NEO4JCloudComplianceScan:
			response.CloudComplianceScan, err = GetScansFor(ctx, scanType, statues)
			if err != nil {
				return response, err
			}
		case "":
			response.VulnerabilityScan, err = GetScansFor(ctx, utils.NEO4JVulnerabilityScan, statues)
			if err != nil {
				return response, err
			}
			response.SecretScan, err = GetScansFor(ctx, utils.NEO4JSecretScan, statues)
			if err != nil {
				return response, err
			}
			response.MalwareScan, err = GetScansFor(ctx, utils.NEO4JMalwareScan, statues)
			if err != nil {
				return response, err
			}
			response.ComplianceScan, err = GetScansFor(ctx, utils.NEO4JComplianceScan, statues)
			if err != nil {
				return response, err
			}
			response.CloudComplianceScan, err = GetScansFor(ctx, utils.NEO4JCloudComplianceScan, statues)
			if err != nil {
				return response, err
			}
		default:
			return response, fmt.Errorf("invalid scan type")
		}
	}
	return response, nil
}

func GetScansFor(ctx context.Context, scanType utils.Neo4jScanType, statues []string) ([]model.Scan, error) {
	scans := []model.Scan{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return scans, err
	}

	log.Info().Msgf("Getting scans for %s and with statues %+v", scanType, statues)
	log.Info().Msgf("len of status: %d", len(statues))

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return scans, err
	}
	defer tx.Close(ctx)
	query := `
	MATCH (n:` + string(scanType) + `)
	WHERE n.status IN $statues
	AND n.acknowledged_at IS NULL
	RETURN n.created_at, n.updated_at, n.node_id, n.is_priority, n.status, n.status_message, n.trigger_action, n.retries`
	if len(statues) == 0 {
		query = `
		MATCH (n:` + string(scanType) + `)
		WHERE n.acknowledged_at IS NULL
		RETURN n.created_at, n.updated_at, n.node_id, n.is_priority, n.status, n.status_message, n.trigger_action, n.retries`
	}
	log.Debug().Msgf("Query: %s", query)
	result, err := tx.Run(ctx, query, map[string]interface{}{"statues": statues})
	if err != nil {
		return scans, err
	}

	rec, err := result.Collect(ctx)
	if err != nil {
		return scans, err
	}

	if len(rec) == 0 {
		return scans, nil
	}

	for i := range rec {
		scan := model.Scan{}
		scan.CreatedAt = rec[i].Values[0].(int64)
		scan.UpdatedAt = rec[i].Values[1].(int64)
		scan.NodeID = rec[i].Values[2].(string)
		scan.IsPriority = rec[i].Values[3].(bool)
		scan.Status = rec[i].Values[4].(string)
		scan.StatusMessage = rec[i].Values[5].(string)
		scan.TriggerAction = rec[i].Values[6].(string)
		scan.Retries = rec[i].Values[7].(int64)
		scans = append(scans, scan)
	}

	return scans, nil
}

func MarkScansRead(ctx context.Context, scanType string, nodeIDs []string) error {
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

	query := `
	MATCH (n:` + scanType + `)
	WHERE n.node_id IN $nodeIDs
	SET n.acknowledged_at = datetime()
	RETURN n`
	log.Debug().Msgf("Query: %s", query)
	_, err = tx.Run(ctx, query, map[string]interface{}{"nodeIDs": nodeIDs})
	if err != nil {
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		return err
	}

	return nil
}
