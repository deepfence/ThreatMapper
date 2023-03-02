package processors

import (
	"context"
	"encoding/json"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	postgresql_db "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	"github.com/twmb/franz-go/pkg/kgo"
)

var auditC chan *kgo.Record

func addAuditLog(record *kgo.Record) {
	auditC <- record
}

func processAuditLog(ctx context.Context, auditC chan *kgo.Record) {
	defer close(auditC)
	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("stop processing audit logs")
			return
		case record := <-auditC:
			pgClient, err := directory.PostgresClient(directory.NewGlobalContext())
			if err != nil {
				log.Error().Err(err).Msg("failed to get db connection")
				return
			}

			var params postgresql_db.CreateAuditLogParams

			if err := json.Unmarshal(record.Value, &params); err != nil {
				log.Error().Err(err).Msg("failed to unmarshal audit log")
			}

			if err := pgClient.CreateAuditLog(context.Background(), params); err != nil {
				log.Error().Err(err).Msg("failed to insert audit log")
			}
		}
	}
}

func StartAuditLogProcessor(ctx context.Context) error {
	// init channel
	auditC = make(chan *kgo.Record, 1000)

	go processAuditLog(ctx, auditC)

	return nil
}
