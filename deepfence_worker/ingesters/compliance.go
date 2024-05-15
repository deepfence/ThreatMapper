package ingesters

import (
	"context"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func CommitFuncCompliance(ctx context.Context, ns string, data []ingestersUtil.Compliance) error {
	ctx = directory.ContextWithNameSpace(ctx, directory.NamespaceID(ns))

	ctx, span := telemetry.NewSpan(ctx, "ingesters", "commit-func-compliance")
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

	if _, err = tx.Run(ctx, `
		UNWIND $batch as row WITH row.rule as rule, row.data as data, row.scan_id as scan_id
		MERGE (n:Compliance{node_id:data.node_id})
		MERGE (r:ComplianceRule{node_id:rule.test_number})
		MERGE (n) -[:IS]-> (r)
		SET n += data,
		    n.masked = COALESCE(n.masked, false),
		    n.updated_at = TIMESTAMP(),
	        r += rule,
		    r.masked = COALESCE(r.masked, false),
		    r.updated_at = TIMESTAMP()
		WITH n, scan_id
		MERGE (m:ComplianceScan{node_id: scan_id})
		MERGE (m) -[l:DETECTED]-> (n)
		SET l.masked = false`,
		map[string]interface{}{"batch": CompliancesToMaps(data)}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func CompliancesToMaps(ms []ingestersUtil.Compliance) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		data, rule := v.Split()
		res = append(res, map[string]interface{}{
			"rule":    utils.ToMap(rule),
			"data":    utils.ToMap(data),
			"scan_id": v.ScanID,
		})
	}
	return res
}
