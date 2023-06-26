package processors

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/twmb/franz-go/pkg/kgo"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
)

var auditC chan *kgo.Record

func addAuditLog(record *kgo.Record) {
	auditC <- record
}

func processAuditLog(ctx context.Context, auditC chan *kgo.Record) {
	defer close(auditC)

	pgClient, err := directory.PostgresClient(directory.WithGlobalContext(ctx))
	if err != nil {
		log.Error().Err(err).Msg("failed to get db connection")
	}

	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("stop processing audit logs")
			return
		case record := <-auditC:

			spanCtx, span := otel.Tracer("audit-log").Start(ctx, "ingest-audit-log")

			var params postgresql_db.CreateAuditLogParams

			if err := json.Unmarshal(record.Value, &params); err != nil {
				log.Error().Err(err).Msg("failed to unmarshal audit log")
				span.RecordError(err)
				span.SetStatus(codes.Error, err.Error())
				span.End()
				continue
			}

			if err := pgClient.CreateAuditLog(spanCtx, params); err != nil {
				log.Error().Err(err).Msgf("failed to insert audit log params: %+v", params)
				span.RecordError(err)
				span.SetStatus(codes.Error, err.Error())
				span.End()
				continue
			}

			span.End()
		}
	}
}

func StartAuditLogProcessor(ctx context.Context) error {
	// init channel
	auditC = make(chan *kgo.Record, 1000)

	go processAuditLog(ctx, auditC)

	return nil
}
