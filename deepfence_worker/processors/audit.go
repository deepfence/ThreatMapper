package processors

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/twmb/franz-go/pkg/kgo"
)

func (i *Ingester) StartAuditLogProcessor(ctx context.Context) error {

	go i.processAuditLog(ctx)

	return nil
}

func (i *Ingester) AddAuditLog(record *kgo.Record) {
	i.auditC <- record
}

func (i *Ingester) processAuditLog(ctx context.Context) {
	defer close(i.auditC)

	for {
		select {
		case <-ctx.Done():
			log.Info().Msgf("stop processing audit logs for ns %s", i.namespace)
			return
		case record := <-i.auditC:

			var err error

			namespace := getNamespace(record.Headers)

			ctx := directory.ContextWithNameSpace(context.Background(), directory.NamespaceID(namespace))

			ctx, span := telemetry.NewSpan(ctx, "audit-log", "ingest-audit-log")

			log := log.WithCtx(ctx)

			pgClient, err := directory.PostgresClient(ctx)
			if err != nil {
				span.EndWithErr(err)
				log.Error().Err(err).Msg("failed to get db connection")
			}

			var params postgresql_db.CreateAuditLogParams

			if err := json.Unmarshal(record.Value, &params); err != nil {
				log.Error().Err(err).Msg("failed to unmarshal audit log")
				span.EndWithErr(err)
				continue
			}

			if err := pgClient.CreateAuditLog(ctx, params); err != nil {
				log.Error().Err(err).Msgf("failed to insert audit log params: %+v", params)
				span.EndWithErr(err)
				continue
			}

			span.End()
		}
	}
}
