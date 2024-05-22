package telemetry

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

type SpanWrapper struct {
	impl trace.Span
}

func NewSpan(ctx context.Context, tracerName string, operationName string) (context.Context, SpanWrapper) {
	ctx, span := otel.GetTracerProvider().Tracer(tracerName).Start(ctx, operationName)
	if ns := ctx.Value("namespace"); ns != nil {
		span.SetAttributes(attribute.String("namespace", fmt.Sprintf("%v", ns)))
	}
	return ctx, SpanWrapper{impl: span}
}

func (sw SpanWrapper) End() {
	if sw.impl.IsRecording() {
		sw.impl.End()
	}
}

func (sw SpanWrapper) RecordErr(err error) {
	sw.impl.RecordError(err)
}

func (sw SpanWrapper) EndWithErr(err error) {
	sw.RecordErr(err)
	sw.impl.SetStatus(codes.Error, err.Error())
	sw.impl.End()
}
