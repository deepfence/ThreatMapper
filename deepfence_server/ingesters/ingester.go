package ingesters

import (
	"context"

	"github.com/twmb/franz-go/pkg/kgo"
)

type Ingester[T any] interface {
	Ingest(ctx context.Context, data T) error
	// TOREMOVE
	PushToDB(batches ReportIngestionData) error
	Close()
}

type KafkaIngester[T any] interface {
	Ingest(ctx context.Context, data T, ingestChan chan *kgo.Record) error
}
