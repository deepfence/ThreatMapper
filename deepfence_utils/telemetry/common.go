package telemetry

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

type SpanWrapper struct {
	impl trace.Span
}

func NewSpan(ctx context.Context, tracerName string, operationName string) SpanWrapper {
	_, span := otel.Tracer(tracerName).Start(ctx, operationName)
	return SpanWrapper{impl: span}
}

func (sw SpanWrapper) End() {
	if sw.impl.IsRecording() {
		sw.impl.End()
	}
}

func (sw SpanWrapper) EndWithErr(err error) {
	sw.impl.RecordError(err)
	sw.impl.SetStatus(codes.Error, err.Error())
	sw.impl.End()
}
