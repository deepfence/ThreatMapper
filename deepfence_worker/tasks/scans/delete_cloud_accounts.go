package scans

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	reportersScan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/hibiken/asynq"
)

func DeleteCloudAccounts(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	var req model.CloudAccountDeleteReq

	if err := json.Unmarshal(task.Payload(), &req); err != nil {
		log.Error().Err(err).Msg("failed to decode cloud account delete request")
		return err
	}

	log.Info().Msgf("delete cloud accounts payload: %v", req)

	// delete accounts
	for _, accontID := range req.NodeIDs {
		if err := deleteCloudAccount(ctx, accontID); err != nil {
			log.Error().Err(err).Msgf("failed to delete cloud account %s", accontID)
		}
	}

	// recompute sice we are removing everything related to the account
	worker, err := directory.Worker(ctx)
	if err != nil {
		return err
	}
	return worker.Enqueue(utils.CachePostureProviders, []byte{}, utils.CritialTaskOpts()...)
}

func deleteCloudAccount(ctx context.Context, accountID string) error {

	ctx, span := telemetry.NewSpan(ctx, "scans", "delete-cloud-account")
	defer span.End()

	log := log.WithCtx(ctx)

	log.Info().Msgf("delete cloud account %s", accountID)

	org, err := isOrgAccount(ctx, accountID)
	if err != nil {
		log.Error().Err(err).Msgf("failed to determine if org account %s", accountID)
		return err
	}
	if org {
		children, err := listOrgChildAccounts(ctx, accountID)
		if err != nil {
			log.Error().Err(err).Msgf("failed to list child accounts for %s", accountID)
			return err
		}
		log.Info().Msgf("org account %s has %d children", accountID, len(children))
		for _, childID := range children {
			if err := deleteScans(ctx, childID); err != nil {
				log.Error().Err(err).Msgf("failed to delete scans for account %s", childID)
			}
			if err := deleteCloudResourceAndNode(ctx, childID); err != nil {
				log.Error().Err(err).Msgf("failed to delete resources for account %s", childID)
			}
		}
	}

	// just single account
	if err := deleteScans(ctx, accountID); err != nil {
		log.Error().Err(err).Msgf("failed to delete scans for account %s", accountID)
		return err
	}
	return deleteCloudResourceAndNode(ctx, accountID)

}

func deleteScans(ctx context.Context, accountID string) error {

	ctx, span := telemetry.NewSpan(ctx, "scans", "delete-scans")
	defer span.End()

	log := log.WithCtx(ctx)

	// delete Cloud/ComplianceScan's related to the account first
	nodeIDs := []model.NodeIdentifier{{NodeID: accountID, NodeType: "cloud_account"}}
	filters := reporters.FieldsFilters{}
	window := model.FetchWindow{Offset: 0, Size: 10000000}

	scans, err := reportersScan.GetScansList(ctx, utils.NEO4JCloudComplianceScan, nodeIDs, filters, window)
	if err != nil {
		log.Error().Err(err).Msgf("failed to list scans for cloud node %s", accountID)
	}

	defer log.Info().Msgf("deleted %d scans for account %s", len(scans.ScansInfo), accountID)

	for _, s := range scans.ScansInfo {
		err := reportersScan.DeleteScan(ctx, utils.NEO4JCloudComplianceScan, s.ScanID)
		if err != nil {
			log.Error().Err(err).Msgf("failed to delete scan id %s", s.ScanID)
		}
	}

	return nil
}

func deleteCloudResourceAndNode(ctx context.Context, accountID string) error {

	ctx, span := telemetry.NewSpan(ctx, "scans", "delete-cloud-resources-and-node")
	defer span.End()

	log := log.WithCtx(ctx)

	defer log.Info().Msgf("deleted cloud node and resources for account %s", accountID)

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

	// delete cloud node and resources
	deleteQuery := `
	MATCH (n:CloudNode{node_id: $node_id})-[:OWNS]->(r:CloudResource)
	DETACH DELETE n,r
	`

	if _, err := tx.Run(ctx, deleteQuery, map[string]any{"node_id": accountID}); err != nil {
		log.Error().Err(err).Msgf("failed to delete cloud node and resources for account %s", accountID)
		return err
	}

	// required in case where link cloud resources task has not yet run
	deleteQuery1 := `MATCH (n:CloudNode{node_id: $node_id})	DETACH DELETE n`
	deleteQuery2 := `MATCH (r:CloudResource{account_id: $node_id}) DETACH DELETE r`

	if _, err := tx.Run(ctx, deleteQuery1, map[string]any{"node_id": accountID}); err != nil {
		log.Error().Err(err).Msgf("failed to delete cloud node account %s", accountID)
		return err
	}

	if _, err := tx.Run(ctx, deleteQuery2, map[string]any{"node_id": accountID}); err != nil {
		log.Error().Err(err).Msgf("failed to delete cloud resources for account %s", accountID)
		return err
	}

	// delete hosts discovered from cloud
	deleteHostsQuery := `
	MATCH (n:Node{account_id: $node_id})
	WHERE n.agent_running=false
	DETACH DELETE n
	`

	if _, err := tx.Run(ctx, deleteHostsQuery, map[string]any{"node_id": accountID}); err != nil {
		log.Error().Err(err).Msgf("failed to delete hosts for account %s", accountID)
		return err
	}

	// delete kube clusters discovered from cloud
	deleteKubeClustersQuery := `
	MATCH (n:KubernetesCluster{account_id: $node_id})
	WHERE n.agent_running=false
	DETACH DELETE n
	`

	if _, err := tx.Run(ctx, deleteKubeClustersQuery, map[string]any{"node_id": accountID}); err != nil {
		log.Error().Err(err).Msgf("failed to delete kubernetes clusters for account %s", accountID)
		return err
	}

	return tx.Commit(ctx)
}

func isOrgAccount(ctx context.Context, accountID string) (bool, error) {
	ctx, span := telemetry.NewSpan(ctx, "scans", "check-org-account")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return false, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return false, err
	}
	defer tx.Close(ctx)

	query := `MATCH (n:CloudNode{node_id: $node_id}) return n.cloud_provider as cloud_provider`

	result, err := tx.Run(ctx, query, map[string]any{"node_id": accountID})
	if err != nil {
		log.Error().Err(err).Msgf("failed to delete cloud node and resources for account %s", accountID)
		return false, err
	}

	record, err := result.Single(ctx)
	if err != nil {
		return false, err
	}

	cp, ok := record.Get("cloud_provider")
	if !ok {
		return false, fmt.Errorf("field not present in the result")
	}

	switch cp.(string) {
	case model.PostureProviderAWSOrg, model.PostureProviderGCPOrg:
		return true, nil
	default:
		return false, nil
	}

}

func listOrgChildAccounts(ctx context.Context, accountID string) ([]string, error) {

	ctx, span := telemetry.NewSpan(ctx, "scans", "list-org-child-accounts")
	defer span.End()

	childern := []string{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return childern, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return childern, err
	}
	defer tx.Close(ctx)

	query := `
	MATCH (n:CloudNode{node_id: $node_id})-[:IS_CHILD]->(c:CloudNode) 
	return c.node_id as child_id
	`

	result, err := tx.Run(ctx, query, map[string]any{"node_id": accountID})
	if err != nil {
		log.Error().Err(err).Msgf("failed to delete cloud node and resources for account %s", accountID)
		return childern, err
	}

	records, err := result.Collect(ctx)
	if err != nil {
		return childern, err
	}

	for _, r := range records {
		cid, ok := r.Get("child_id")
		if ok {
			childern = append(childern, cid.(string))
		}
	}

	return childern, nil
}
