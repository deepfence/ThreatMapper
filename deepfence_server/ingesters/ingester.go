package ingesters

import (
	"context"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/twmb/franz-go/pkg/kgo"
)

type Ingester[T any] interface {
	Ingest(ctx context.Context, data T) error
	IsReady() bool
	// TOREMOVE
	PushToDB(batches ReportIngestionData, session neo4j.Session) error
	Close()
}

type KafkaIngester[T any] interface {
	Ingest(ctx context.Context, data T, ingestChan chan *kgo.Record) error
}
