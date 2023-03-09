package controls

import (
	"context"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func GetCloudNodeComplianceControls(ctx context.Context, nodeId, cloudProvider, complianceType string) ([]model.CloudNodeComplianceControl, error) {
	var controls []model.CloudNodeComplianceControl

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return controls, err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return controls, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return controls, err
	}
	defer tx.Close()

	r, err := tx.Run(`MATCH (n:CloudComplianceControl {
			cloud_provider: $cloud_provider,
			compliance_type: $compliance_type,
			active: true
		})
		RETURN n.node_id, n.title, n.description, n.service, n.category_hierarchy`,
		map[string]interface{}{"cloud_provider": cloudProvider, "compliance_type": complianceType})

	if err != nil {
		return controls, err
	}

	records, err := r.Collect()

	if err != nil {
		return controls, err
	}

	for _, rec := range records {
		var categoryHierarchy []string
		for _, rVal := range rec.Values[4].([]interface{}) {
			categoryHierarchy = append(categoryHierarchy, rVal.(string))
		}
		control := model.CloudNodeComplianceControl{
			ControlId:         rec.Values[0].(string),
			Title:             rec.Values[1].(string),
			Description:       rec.Values[2].(string),
			Service:           rec.Values[3].(string),
			CategoryHierarchy: categoryHierarchy,
		}
		controls = append(controls, control)
	}

	return controls, tx.Commit()
}

func EnableCloudNodeComplianceControls(ctx context.Context, nodeId string, controlIds []string) error {
	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	_, err = tx.Run(`MATCH (n:CloudComplianceControl {})
		WHERE n.node_id IN $control_ids
		SET n.active = true`,
		map[string]interface{}{"control_ids": controlIds})
	if err != nil {
		return err
	}

	return tx.Commit()
}

func DisableCloudNodeComplianceControls(ctx context.Context, nodeId string, controlIds []string) error {
	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := client.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	_, err = tx.Run(`MATCH (n:CloudComplianceControl {})
		WHERE n.node_id IN $control_ids
		SET n.active = false`,
		map[string]interface{}{"control_ids": controlIds})
	if err != nil {
		return err
	}

	return tx.Commit()
}
