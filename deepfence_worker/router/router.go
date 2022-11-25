package router

import (
	"github.com/deepfence/ThreatMapper/deepfence_worker/handler"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks"
	"github.com/hibiken/asynq"
)

func SetupRoutes(r *asynq.ServeMux) {
	r.HandleFunc("agent_report", handler.IngestAgentReport)
	r.HandleFunc("cloud_scanner_report", handler.IngestCloudScannerReport)
	r.HandleFunc("agent_scanner_report", handler.IngestAgentScannerReport)
	r.HandleFunc("agent_alerts", handler.IngestAgentAlerts)
	r.HandleFunc(tasks.PingTaskID, tasks.HandlePingTask)
}
