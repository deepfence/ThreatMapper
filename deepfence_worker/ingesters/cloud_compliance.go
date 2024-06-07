package ingesters

import (
	"context"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func CommitFuncCloudCompliance(ctx context.Context, ns string, data []ingestersUtil.CloudCompliance) error {
	ctx = directory.ContextWithNameSpace(ctx, directory.NamespaceID(ns))

	ctx, span := telemetry.NewSpan(ctx, "ingesters", "commit-func-cloud-compliance")
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
		UNWIND $batch as row
		MATCH (l:CloudComplianceScan{node_id: row.scan_id})
		MERGE (n:CloudCompliance{node_id: row.node_id})
		MERGE (l) -[r:DETECTED]-> (n)
		SET n+=row,
			n.masked = COALESCE(n.masked, false),
			n.updated_at = TIMESTAMP(),
		    r.masked = false`,
		map[string]interface{}{"batch": CloudCompliancesToMaps(data)}); err != nil {
		return err
	}

	if _, err = tx.Run(ctx, `
		UNWIND $batch as row
		MATCH (m:CloudResource{node_id: row.resource})
		MATCH (n:CloudCompliance{node_id: row.node_id})
		MERGE (n) -[:SCANNED]-> (m)`,
		map[string]interface{}{"batch": CloudCompliancesToMaps(data)}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func CloudCompliancesToMaps(ms []ingestersUtil.CloudCompliance) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		data := v.ToMap()

		nodeIdElem := []string{data["control_id"].(string)}
		if _, ok := data["resource"]; ok {
			nodeIdElem = append(nodeIdElem, data["resource"].(string))
		} else if _, ok := data["account_id"]; ok {
			nodeIdElem = append(nodeIdElem, data["resource"].(string))
		}

		// nodeIdElem = append(nodeIdElem, data["scan_id"].(string))
		data["node_id"] = strings.Join(nodeIdElem, "--")

		cp, cpFound := data["cloud_provider"]
		controlID, idFound := data["control_id"]

		if cpFound && idFound {
			data["full_control_id"] = cp.(string) + "_compliance." + controlID.(string)
		}

		res = append(res, data)
	}
	return res
}
