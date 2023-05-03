package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	postgresqlDb "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

const (
	VULNERABILITY_SCAN_CRON    = "0 0 * * 0"
	SECRET_SCAN_CRON           = "0 0 * * 1"
	MALWARE_SCAN_CRON          = "0 0 * * 2"
	COMPLIANCE_SCAN_CRON       = "0 0 * * 3"
	CLOUD_COMPLIANCE_SCAN_CRON = "0 0 * * 4"
)

var (
	nodeTypeLabels = map[string]string{
		utils.NodeTypeHost:              "host",
		utils.NodeTypeContainer:         "container",
		utils.NodeTypeContainerImage:    "container image",
		utils.NodeTypeKubernetesCluster: "kubernetes cluster",
		utils.NodeTypeCloudNode:         "cloud account",
	}
)

func InitializeScheduler(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	_, err := pgClient.GetSchedules(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		// Vulnerability Scan
		for _, nodeType := range []string{utils.NodeTypeHost, utils.NodeTypeContainer} {
			payload := map[string]string{"node_type": nodeType}
			payloadJson, _ := json.Marshal(payload)
			_, err = pgClient.CreateSchedule(ctx, postgresqlDb.CreateScheduleParams{
				Action:      utils.VULNERABILITY_SCAN,
				Description: fmt.Sprintf("Vulnerability scan on all %ss", nodeTypeLabels[nodeType]),
				CronExpr:    VULNERABILITY_SCAN_CRON,
				Payload:     payloadJson,
				IsEnabled:   true,
				IsSystem:    true,
			})
			if err != nil {
				return err
			}
		}

		// Secret Scan
		for _, nodeType := range []string{utils.NodeTypeHost, utils.NodeTypeContainer} {
			payload := map[string]string{"node_type": nodeType}
			payloadJson, _ := json.Marshal(payload)
			_, err = pgClient.CreateSchedule(ctx, postgresqlDb.CreateScheduleParams{
				Action:      utils.SECRET_SCAN,
				Description: fmt.Sprintf("Secret scan on all %ss", nodeTypeLabels[nodeType]),
				CronExpr:    SECRET_SCAN_CRON,
				Payload:     payloadJson,
				IsEnabled:   true,
				IsSystem:    true,
			})
			if err != nil {
				return err
			}
		}

		// Malware Scan
		for _, nodeType := range []string{utils.NodeTypeHost, utils.NodeTypeContainer} {
			payload := map[string]string{"node_type": nodeType}
			payloadJson, _ := json.Marshal(payload)
			_, err = pgClient.CreateSchedule(ctx, postgresqlDb.CreateScheduleParams{
				Action:      utils.MALWARE_SCAN,
				Description: fmt.Sprintf("Malware scan on all %ss", nodeTypeLabels[nodeType]),
				CronExpr:    MALWARE_SCAN_CRON,
				Payload:     payloadJson,
				IsEnabled:   true,
				IsSystem:    true,
			})
			if err != nil {
				return err
			}
		}

		// Compliance Scan
		for _, nodeType := range []string{utils.NodeTypeHost, utils.NodeTypeKubernetesCluster} {
			payload := map[string]string{"node_type": nodeType}
			payloadJson, _ := json.Marshal(payload)
			_, err = pgClient.CreateSchedule(ctx, postgresqlDb.CreateScheduleParams{
				Action:      utils.COMPLIANCE_SCAN,
				Description: fmt.Sprintf("Compliance scan on all %ss", nodeTypeLabels[nodeType]),
				CronExpr:    COMPLIANCE_SCAN_CRON,
				Payload:     payloadJson,
				IsEnabled:   true,
				IsSystem:    true,
			})
			if err != nil {
				return err
			}
		}
	} else if err != nil {
		return err
	}
	return nil
}
