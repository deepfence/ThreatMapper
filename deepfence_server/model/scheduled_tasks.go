package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

const (
	VulnerabilityScanCron   = "0 0 0 * * 0"
	SecretScanCron          = "0 0 0 * * 1"
	MalwareScanCron         = "0 0 0 * * 2"
	ComplianceScanCron      = "0 0 0 * * 3"
	CloudComplianceScanCron = "0 0 0 * * 4"
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

type AddScheduledTaskRequest struct {
	Action      string `json:"action" validate:"required,oneof=SecretScan VulnerabilityScan MalwareScan ComplianceScan CloudComplianceScan" required:"true" enum:"SecretScan,VulnerabilityScan,MalwareScan,ComplianceScan,CloudComplianceScan"`
	Description string `json:"description"`
	CronExpr    string `json:"cron_expr"`
	ScheduleTaskPayload
}

type ScheduleTaskPayload struct {
	ScanTriggerCommon
	ScanConfigLanguages []VulnerabilityScanConfigLanguage `json:"scan_config" required:"true"`
	ComplianceBenchmarkTypes
}

type ScheduleJobID struct {
	ID int64 `path:"id"`
}

type UpdateScheduledTaskRequest struct {
	ID        int64 `path:"id" validate:"required" required:"true"`
	IsEnabled bool  `json:"is_enabled" required:"true"`
}

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

func UpdateScheduledTask(ctx context.Context, id int64, updateScheduledTask UpdateScheduledTaskRequest) error {

	ctx, span := telemetry.NewSpan(ctx, "model", "update-scheduled-task")
	defer span.End()

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

func DeleteCustomSchedule(ctx context.Context, id int64) error {

	ctx, span := telemetry.NewSpan(ctx, "model", "delete-custom-schedule")
	defer span.End()

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}
	return pgClient.DeleteCustomSchedule(ctx, id)
}

func AddScheduledTask(ctx context.Context, req AddScheduledTaskRequest) error {
	ctx, span := telemetry.NewSpan(ctx, "model", "add-scheduled-task")
	defer span.End()

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}

	payload := ScheduleTaskPayload{}
	payload.NodeIDs = req.NodeIDs
	payload.Filters = req.Filters
	payload.ScanConfigLanguages = req.ScanConfigLanguages
	payload.BenchmarkTypes = req.BenchmarkTypes
	payload.IsPriority = req.IsPriority
	payload.DeepfenceSystemScan = req.DeepfenceSystemScan
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	params := postgresqlDb.CreateScheduleParams{}
	params.Action = req.Action
	params.CronExpr = req.CronExpr
	params.Description = req.Description
	params.IsEnabled = true
	params.IsSystem = false
	params.Payload = payloadJSON

	_, err = pgClient.CreateSchedule(ctx, params)
	return err
}

func InitializeScheduledTasks(ctx context.Context, pgClient *postgresqlDb.Queries) error {

	ctx, span := telemetry.NewSpan(ctx, "model", "init-scheduled-tasks")
	defer span.End()

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

		scheduleStr, _ := json.Marshal(map[string]interface{}{"action": utils.VulnerabilityScan, "payload": payload, "cron": VulnerabilityScanCron})
		if utils.InSlice(utils.GenerateHashFromString(string(scheduleStr)), jobHashes) {
			continue
		}

		payloadJSON, _ := json.Marshal(payload)
		_, err = pgClient.CreateSchedule(ctx, postgresqlDb.CreateScheduleParams{
			Action:      utils.VulnerabilityScan,
			Description: fmt.Sprintf("Vulnerability scan on all %ss", nodeTypeLabels[nodeType]),
			CronExpr:    VulnerabilityScanCron,
			Payload:     payloadJSON,
			IsEnabled:   false,
			IsSystem:    true,
		})
		if err != nil {
			return err
		}
	}

	// Secret Scan
	for _, nodeType := range []string{utils.NodeTypeHost, utils.NodeTypeContainer} {
		payload := map[string]string{"node_type": nodeType}

		scheduleStr, _ := json.Marshal(map[string]interface{}{"action": utils.SecretScan, "payload": payload, "cron": SecretScanCron})
		if utils.InSlice(utils.GenerateHashFromString(string(scheduleStr)), jobHashes) {
			continue
		}

		payloadJSON, _ := json.Marshal(payload)
		_, err = pgClient.CreateSchedule(ctx, postgresqlDb.CreateScheduleParams{
			Action:      utils.SecretScan,
			Description: fmt.Sprintf("Secret scan on all %ss", nodeTypeLabels[nodeType]),
			CronExpr:    SecretScanCron,
			Payload:     payloadJSON,
			IsEnabled:   false,
			IsSystem:    true,
		})
		if err != nil {
			return err
		}
	}

	// Malware Scan
	for _, nodeType := range []string{utils.NodeTypeHost, utils.NodeTypeContainer} {
		payload := map[string]string{"node_type": nodeType}

		scheduleStr, _ := json.Marshal(map[string]interface{}{"action": utils.MalwareScan, "payload": payload, "cron": MalwareScanCron})
		if utils.InSlice(utils.GenerateHashFromString(string(scheduleStr)), jobHashes) {
			continue
		}

		payloadJSON, _ := json.Marshal(payload)
		_, err = pgClient.CreateSchedule(ctx, postgresqlDb.CreateScheduleParams{
			Action:      utils.MalwareScan,
			Description: fmt.Sprintf("Malware scan on all %ss", nodeTypeLabels[nodeType]),
			CronExpr:    MalwareScanCron,
			Payload:     payloadJSON,
			IsEnabled:   false,
			IsSystem:    true,
		})
		if err != nil {
			return err
		}
	}

	// Compliance Scan
	for _, nodeType := range []string{utils.NodeTypeHost, utils.NodeTypeKubernetesCluster} {
		payload := map[string]string{"node_type": nodeType}

		scheduleStr, _ := json.Marshal(map[string]interface{}{"action": utils.ComplianceScan, "payload": payload, "cron": ComplianceScanCron})
		if utils.InSlice(utils.GenerateHashFromString(string(scheduleStr)), jobHashes) {
			continue
		}

		payloadJSON, _ := json.Marshal(payload)
		_, err = pgClient.CreateSchedule(ctx, postgresqlDb.CreateScheduleParams{
			Action:      utils.ComplianceScan,
			Description: fmt.Sprintf("Compliance scan on all %ss", nodeTypeLabels[nodeType]),
			CronExpr:    ComplianceScanCron,
			Payload:     payloadJSON,
			IsEnabled:   false,
			IsSystem:    true,
		})
		if err != nil {
			return err
		}
	}
	return nil
}
