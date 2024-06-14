package controls

import (
	"context"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func GetCloudNodeComplianceControls(ctx context.Context, nodeID string, cloudProvider string, complianceType []string) ([]model.CloudNodeComplianceControl, error) {

	ctx, span := telemetry.NewSpan(ctx, "control", "get-cloudnode-compliance-controls")
	defer span.End()

	var controls []model.CloudNodeComplianceControl

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return controls, err
	}

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return controls, err
	}
	defer tx.Close(ctx)

	query := `
	MATCH (n:CloudComplianceControl{cloud_provider: $cloud_provider})
	WHERE n.disabled = false
	AND n.compliance_type in $compliance_type
	RETURN n.node_id, n.title, n.description, n.service, n.category_hierarchy, n.category_hierarchy_short, n.control_id, n.active, n.compliance_type`

	r, err := tx.Run(
		ctx,
		query,
		map[string]interface{}{
			"cloud_provider":  cloudProvider,
			"compliance_type": complianceType,
		},
	)
	if err != nil {
		return controls, err
	}

	records, err := r.Collect(ctx)

	if err != nil {
		return controls, err
	}

	for _, rec := range records {
		categoryHierarchy := []string{}
		if rec.Values[4] != nil {
			for _, rVal := range rec.Values[4].([]interface{}) {
				categoryHierarchy = append(categoryHierarchy, rVal.(string))
			}
		}
		control := model.CloudNodeComplianceControl{
			NodeID:                 rec.Values[0].(string),
			Title:                  rec.Values[1].(string),
			Description:            rec.Values[2].(string),
			Service:                rec.Values[3].(string),
			CategoryHierarchy:      categoryHierarchy,
			CategoryHierarchyShort: rec.Values[5].(string),
			ControlID:              rec.Values[6].(string),
			Enabled:                rec.Values[7].(bool),
			ComplianceType:         rec.Values[8].(string),
		}
		controls = append(controls, control)
	}

	return controls, tx.Commit(ctx)
}

func EnableCloudNodeComplianceControls(ctx context.Context, nodeID string, controlIds []string) error {

	ctx, span := telemetry.NewSpan(ctx, "control", "enable-cloudnode-compliance-controls")
	defer span.End()

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	_, err = tx.Run(ctx, `MATCH (n:CloudComplianceControl {})
		WHERE n.node_id IN $control_ids
		SET n.active = true`,
		map[string]interface{}{"control_ids": controlIds})
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func DisableCloudNodeComplianceControls(ctx context.Context, nodeID string, controlIDs []string) error {

	ctx, span := telemetry.NewSpan(ctx, "control", "disable-cloudnode-compliance-controls")
	defer span.End()

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := client.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	_, err = tx.Run(ctx, `MATCH (n:CloudComplianceControl {})
		WHERE n.node_id IN $control_ids
		SET n.active = false`,
		map[string]interface{}{"control_ids": controlIDs})
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
