package ingesters

import (
	"context"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

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
		MERGE (r:SecretRule{rule_id:rule.rule_id})
		SET r+=rule,
		    r.masked = COALESCE(r.masked, false),
		    r.updated_at = TIMESTAMP()
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
		secret := utils.ToMap(i)
		delete(secret, "Severity")
		delete(secret, "Rule")
		delete(secret, "Match")

		for k, v := range utils.ToMap(i.Severity) {
			secret[k] = v
		}

		for k, v := range utils.ToMap(i.Match) {
			secret[k] = v
		}

		secret["node_id"] = utils.ScanIDReplacer.Replace(fmt.Sprintf("%v:%v",
			i.Rule.ID, i.Match.FullFilename))
		rule := utils.ToMap(i.Rule)
		delete(rule, "id")
		rule["rule_id"] = i.Rule.ID
		rule["level"] = i.Severity.Level
		secrets = append(secrets, map[string]map[string]interface{}{
			"Rule":   rule,
			"Secret": secret,
		})
	}
	return secrets, nil
}
