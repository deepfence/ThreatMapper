package cronjobs

import (
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/deepfence/ThreatMapper/deepfence_server/diagnosis"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/minio/minio-go/v7"
)

func CleanUpDiagnosisLogs(msg *message.Message) error {
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))

	mc, err := directory.MinioClient(ctx)
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

	return nil
}
