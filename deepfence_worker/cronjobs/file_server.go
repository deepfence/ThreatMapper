package cronjobs

import (
	"context"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/diagnosis"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/hibiken/asynq"
	"github.com/minio/minio-go/v7"
)

func CleanUpDiagnosisLogs(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		return err
	}

	sixHoursAgo := time.Now().Add(time.Duration(-6) * time.Hour)

	cleanup := func(pathPrefix string) {
		objects := mc.ListFiles(ctx, pathPrefix, false, 0, true)
		for _, obj := range objects {
			if obj.LastModified.Before(sixHoursAgo) {
				err = mc.DeleteFile(ctx, obj.Key, false, minio.RemoveObjectOptions{ForceDelete: true})
				if err != nil {
					log.Warn().Msg(err.Error())
				}
			}
		}
	}
	cleanup(diagnosis.ConsoleDiagnosisFileServerPrefix)
	cleanup(diagnosis.AgentDiagnosisFileServerPrefix)
	cleanup(diagnosis.CloudScannerDiagnosticLogsPrefix)

	return nil
}
