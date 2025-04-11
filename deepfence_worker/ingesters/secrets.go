package ingesters

import (
	"context"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func generateSecretRuleId(r map[string]interface{}) string {
	return fmt.Sprintf("index-%s", r["name"].(string))
}

func CommitFuncSecrets(ctx context.Context, ns string, data []ingestersUtil.Secret) error {
	ctx = directory.ContextWithNameSpace(ctx, directory.NamespaceID(ns))

	ctx, span := telemetry.NewSpan(ctx, "ingesters", "commit-func-secrets")
	defer span.End()

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

	dataMap, err := secretsToMaps(data)
	if err != nil {
		return err
	}

	if _, err = tx.Run(ctx, `
		UNWIND $batch as row WITH row.Rule as rule, row.Secret as secret
		MATCH (r:SecretRule{rule_id:rule.rule_id})
		WITH secret as row, r
		MERGE (n:Secret{node_id:row.node_id})
		SET n+= row,
			n.masked = COALESCE(n.masked, r.masked, false),
			n.updated_at = TIMESTAMP()
		WITH n, r, row
		MERGE (n)-[:IS]->(r)
		MERGE (m:SecretScan{node_id: row.scan_id})
		WITH n, m
		MERGE (m) -[l:DETECTED]-> (n)
		SET l.masked = COALESCE(n.masked, false)`,
		map[string]interface{}{"batch": dataMap}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func secretsToMaps(data []ingestersUtil.Secret) ([]map[string]map[string]interface{}, error) {

	var secrets []map[string]map[string]interface{}
	for _, i := range data {
		ruleID := generateSecretRuleId(utils.ToMap(i.Rule))
		rule := map[string]interface{}{
			"rule_id": ruleID,
		}

		s := model.Secret{
			NodeID:         utils.ScanIDReplacer.Replace(fmt.Sprintf("%v:%v", ruleID, i.Match.FullFilename)),
			StartingIndex:  int32(i.Match.StartingIndex),
			FullFilename:   i.Match.FullFilename,
			MatchedContent: i.Match.MatchedContent,
			Masked:         false,
			Level:          i.Severity.Level,
			Score:          i.Severity.Score,
			RuleID:         ruleID,
		}

		secret := utils.ToMap(s)
		secret["scan_id"] = i.ScanID
		delete(secret, "resources")

		secrets = append(secrets, map[string]map[string]interface{}{
			"Rule":   rule,
			"Secret": secret,
		})
	}
	return secrets, nil
}
