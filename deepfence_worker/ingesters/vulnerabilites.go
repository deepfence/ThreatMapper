package ingesters

import (
	"context"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func CommitFuncVulnerabilities(ctx context.Context, ns string, data []ingestersUtil.Vulnerability) error {
	ctx = directory.ContextWithNameSpace(ctx, directory.NamespaceID(ns))

	ctx, span := telemetry.NewSpan(ctx, "ingesters", "commit-func-vulnerabilities")
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

	dataMap, err := CVEsToMaps(data)
	if err != nil {
		return err
	}

	log.Debug().Msgf("Committing %d vulnerabilities", len(dataMap))

	if _, err = tx.Run(ctx, `
		UNWIND $batch as row WITH row.rule as rule, row.data as data, 
		row.scan_id as scan_id, row.node_id as node_id
		MERGE (v:VulnerabilityStub{node_id:rule.cve_id})
		MERGE (n:Vulnerability{node_id:node_id})
		MERGE (n) -[:IS]-> (v)
		SET v += rule,
		    v.masked = COALESCE(v.masked, false),
		    v.updated_at = TIMESTAMP(),
		    n += data,
		    n.masked = COALESCE(n.masked, v.masked, false),
		    n.updated_at = TIMESTAMP()
		WITH n, scan_id
		MATCH (m:VulnerabilityScan{node_id: scan_id})
		MERGE (m) -[r:DETECTED]-> (n)
		SET r.masked = COALESCE(n.masked, false)`,
		map[string]interface{}{"batch": dataMap}); err != nil {
		log.Error().Msgf(err.Error())
		return err
	}

	return tx.Commit(ctx)
}

func CVEsToMaps(ms []ingestersUtil.Vulnerability) ([]map[string]interface{}, error) {
	res := []map[string]interface{}{}
	for _, v := range ms {
		data, rule := v.Split()

		res = append(res, map[string]interface{}{
			"rule":    utils.ToMap(rule),
			"data":    utils.ToMap(data),
			"scan_id": v.ScanID,
			"node_id": strings.Join([]string{data.CveCausedByPackagePath + data.CveCausedByPackage + rule.CveID}, "_"),
		})
	}
	return res, nil
}
