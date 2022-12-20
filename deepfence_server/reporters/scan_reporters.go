package reporters

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	STATUS_PROGRESS = "progress"
	STATUS_COMPLETE = "complete"
)

func GetSecretScanStatus(ctx context.Context, scan_id string) (model.ScanStatusResp, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return model.ScanStatusResp{}, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return model.ScanStatusResp{}, err
	}
	defer tx.Close()

	res, err := tx.Run("MATCH (m:SecretScan{node_id: $scan_id}) RETURN m.status",
		map[string]interface{}{"scan_id": scan_id})
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	rec, err := res.Single()
	if err != nil {
		return model.ScanStatusResp{}, err
	}

	return model.ScanStatusResp{Status: model.ScanStatus(rec.Values[0].(string))}, nil
}
