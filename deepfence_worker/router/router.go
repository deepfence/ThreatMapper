package router

import (
	"github.com/deepfence/ThreatMapper/deepfence_worker/handler"
	"github.com/deepfence/ThreatMapper/deepfence_worker/tasks"
	"github.com/hibiken/asynq"
)

func SetupRoutes(r *asynq.ServeMux) {
	r.HandleFunc(tasks.PingTaskID, tasks.HandlePingTask)
	r.HandleFunc(tasks.CleanUpGraphDBTaskID, handler.CleanUpGraphDB)
}
