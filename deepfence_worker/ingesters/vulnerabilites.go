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

	res, err := tx.Run(ctx, `
		UNWIND $batch as row WITH row.data as data
		MATCH (v:VulnerabilityStub{node_id:data.cve_id})
		return v.package_names, v.namespaces, v.cve_types, v.cve_attack_vectors, v.cve_fixed_ins, v.exploit_pocs`,
		map[string]interface{}{"batch": dataMap})
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}

	recs, err := res.Collect(ctx)
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}
	for i, rec := range recs {
		package_names := rec.Values[0].([]any)
		namespaces := rec.Values[1].([]any)
		cve_types := rec.Values[2].([]any)
		cve_attack_vectors := rec.Values[3].([]any)
		cve_fixed_ins := rec.Values[4].([]any)
		exploit_pocs := rec.Values[5].([]any)

		data := dataMap[i]["data"].(map[string]any)
		data["cve_type"] = cve_types[0]
		data["cve_attack_vector"] = cve_attack_vectors[0]
		data["cve_fixed_in"] = cve_fixed_ins[0]
		data["exploit_poc"] = exploit_pocs[0]
		for j := range package_names {
			if data["package_name"].(string) == package_names[j].(string) {
				if data["namespace"].(string) == namespaces[j].(string) {
					data["cve_type"] = cve_types[j]
					data["cve_attack_vector"] = cve_attack_vectors[j]
					data["cve_fixed_in"] = cve_fixed_ins[j]
					data["exploit_poc"] = exploit_pocs[j]
					break
				}
			}
		}

	}

	if _, err = tx.Run(ctx, `
		UNWIND $batch as row WITH row.data as data, row.scan_id as scan_id, row.node_id as node_id
		MATCH (v:VulnerabilityStub{node_id:data.cve_id})
		MERGE (n:Vulnerability{node_id:node_id})
		MERGE (n) -[:IS]-> (v)
		SET n += data,
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
		data := v.GetVulnerabilityData()

		res = append(res, map[string]interface{}{
			"data":    utils.ToMap(data),
			"scan_id": v.ScanID,
			"node_id": strings.Join([]string{data.CveCausedByPackagePath + data.CveCausedByPackage + data.CveID}, "_"),
		})
	}
	return res, nil
}
