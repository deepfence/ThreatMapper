package ingesters

import (
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func CommitFuncVulnerabilities(ns string, data []ingestersUtil.Vulnerability) error {
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(ns))
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

	if _, err = tx.Run(`
		UNWIND $batch as row WITH row.rule as rule, row.data as data, row.scan_id as scan_id
		MERGE (v:VulnerabilityStub{node_id:rule.cve_id})
		MERGE (n:Vulnerability{node_id:data.cve_caused_by_package+rule.cve_id})
		MERGE (n) -[:IS]-> (v)
		SET v += rule,
		    v.masked = COALESCE(v.masked, false),
		    v.updated_at = TIMESTAMP(),
		    n += data,
		    n.masked = COALESCE(n.masked, false),
		    n.updated_at = TIMESTAMP()
		WITH n, scan_id
		MATCH (m:VulnerabilityScan{node_id: scan_id})
		MERGE (m) -[r:DETECTED]-> (n)
		SET r.masked = false`,
		map[string]interface{}{"batch": CVEsToMaps(data)}); err != nil {
		log.Error().Msgf(err.Error())
		return err
	}

	return tx.Commit()
}

func CVEsToMaps(ms []ingestersUtil.Vulnerability) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		data, rule := v.Split()
		res = append(res, map[string]interface{}{
			"rule":    utils.ToMap(rule),
			"data":    utils.ToMap(data),
			"scan_id": v.ScanId,
		})
	}
	return res
}
