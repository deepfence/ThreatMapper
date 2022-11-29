package ingesters

import "context"

type Ingester[T any] interface {
	Ingest(ctx context.Context, data T) error
}
