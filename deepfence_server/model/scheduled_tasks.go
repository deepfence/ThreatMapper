package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
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

func GetScheduledTask(ctx context.Context) ([]postgresqlDb.Scheduler, error) {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return nil, err
	}
	schedules, err := pgClient.GetSchedules(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return []postgresqlDb.Scheduler{}, nil
	} else if err != nil {
		return nil, err
	}
	return schedules, nil
}

type UpdateScheduledTaskRequest struct {
	IsEnabled bool `json:"is_enabled" required:"true"`
}

func UpdateScheduledTask(ctx context.Context, id int64, updateScheduledTask UpdateScheduledTaskRequest) error {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}
	schedule, err := pgClient.GetSchedule(ctx, id)
	if err != nil {
		return err
	}
	return pgClient.UpdateSchedule(ctx, postgresqlDb.UpdateScheduleParams{
		Description: schedule.Description,
		CronExpr:    schedule.CronExpr,
		Payload:     schedule.Payload,
		IsEnabled:   updateScheduledTask.IsEnabled,
		Status:      schedule.Status,
		ID:          id,
	})
}

func InitializeScheduledTasks(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	schedules, err := pgClient.GetSchedules(ctx)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
	}
	var jobHashes []string
	for _, schedule := range schedules {
		jobHashes = append(jobHashes, utils.GetScheduledJobHash(schedule))
	}
	// Vulnerability Scan
	for _, nodeType := range []string{utils.NodeTypeHost, utils.NodeTypeContainer} {
		payload := map[string]string{"node_type": nodeType}

		scheduleStr, _ := json.Marshal(map[string]interface{}{"action": utils.VULNERABILITY_SCAN, "payload": payload, "cron": VULNERABILITY_SCAN_CRON})
		if utils.InSlice(utils.GenerateHashFromString(string(scheduleStr)), jobHashes) {
			continue
		}

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

		scheduleStr, _ := json.Marshal(map[string]interface{}{"action": utils.SECRET_SCAN, "payload": payload, "cron": SECRET_SCAN_CRON})
		if utils.InSlice(utils.GenerateHashFromString(string(scheduleStr)), jobHashes) {
			continue
		}

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

		scheduleStr, _ := json.Marshal(map[string]interface{}{"action": utils.MALWARE_SCAN, "payload": payload, "cron": MALWARE_SCAN_CRON})
		if utils.InSlice(utils.GenerateHashFromString(string(scheduleStr)), jobHashes) {
			continue
		}

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

		scheduleStr, _ := json.Marshal(map[string]interface{}{"action": utils.COMPLIANCE_SCAN, "payload": payload, "cron": COMPLIANCE_SCAN_CRON})
		if utils.InSlice(utils.GenerateHashFromString(string(scheduleStr)), jobHashes) {
			continue
		}

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
	return nil
}
