package reporters_scan

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/rs/zerolog/log"
)

type ScanStatus struct {
	Status string
	Count  int64
}

func getScanStatuses[T reporters.Cypherable](tx neo4j.Transaction, scanType utils.Neo4jScanType, nodeIds []string) ([]ScanStatus, error) {
	res := []ScanStatus{}
	var dummy T
	var r neo4j.Result
	query := `
	MATCH (n:` + dummy.NodeType() + `) <-[:SCANNED]- (s:` + string(scanType) + `)
	WHERE n.node_id IN $ids
	WITH n.node_id as id, min(s.updated_at) as latest
	MATCH (s:` + string(scanType) + `{updated_at: latest}) -[:DETECTED]-> (v)
	RETURN id, s.status, count(v)
	ORDER BY id`

	log.Info().Msgf("query: %s", query)
	r, err := tx.Run(query,
		map[string]interface{}{"ids": nodeIds})

	if err != nil {
		return res, err
	}

	recs, err := r.Collect()

	if err != nil {
		return res, err
	}

	statuses := map[string]ScanStatus{}
	for _, rec := range recs {
		statuses[rec.Values[0].(string)] = ScanStatus{
			Status: rec.Values[1].(string),
			Count:  rec.Values[2].(int64),
		}
	}

	for i := range nodeIds {
		res = append(res, statuses[nodeIds[i]])
	}

	return res, nil
}

func GetScanStatuses[T reporters.Cypherable](ctx context.Context, node_ids []string) ([]model.RegularScanStatus, error) {
	res := []model.RegularScanStatus{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session, err := driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	vuln_status, err := getScanStatuses[T](tx, utils.NEO4J_VULNERABILITY_SCAN, node_ids)
	if err != nil {
		return res, err
	}
	secrets_status, err := getScanStatuses[T](tx, utils.NEO4J_SECRET_SCAN, node_ids)
	if err != nil {
		return res, err
	}
	malware_status, err := getScanStatuses[T](tx, utils.NEO4J_MALWARE_SCAN, node_ids)
	if err != nil {
		return res, err
	}
	compliance_status, err := getScanStatuses[T](tx, utils.NEO4J_COMPLIANCE_SCAN, node_ids)
	if err != nil {
		return res, err
	}
	cloud_compliance_status, err := getScanStatuses[T](tx, utils.NEO4J_CLOUD_COMPLIANCE_SCAN, node_ids)
	if err != nil {
		return res, err
	}

	for i := range node_ids {
		res = append(res, model.RegularScanStatus{
			VulnerabilitiesCount:      vuln_status[i].Count,
			VulnerabilityScanStatus:   vuln_status[i].Status,
			SecretsCount:              secrets_status[i].Count,
			SecretScanStatus:          secrets_status[i].Status,
			MalwaresCount:             malware_status[i].Count,
			MalwareScanStatus:         malware_status[i].Status,
			CompliancesCount:          compliance_status[i].Count,
			ComplianceScanStatus:      compliance_status[i].Status,
			CloudCompliancesCount:     cloud_compliance_status[i].Count,
			CloudComplianceScanStatus: cloud_compliance_status[i].Status,
		})
	}

	return res, nil
}
