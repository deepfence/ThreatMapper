// Package neotrace provides an adapter to emit neo4j Bolt logs as OTel trace events
package directory

import (
	"context"
	"fmt"
	"strings"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j/log"
	"go.opentelemetry.io/otel/attribute"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
	apitrace "go.opentelemetry.io/otel/trace"
)

const tracerName = "bolt-logger"

// New returns a BoltLogger adapter
func NewNeoTrace(
	c context.Context,
	tp apitrace.TracerProvider, // todo: consider funtional option pattern
) *Logger {
	return &Logger{ctx: c, provider: tp}
}

// Logger is a type that adapts to the neo4j/log.BoltLogger interface
type Logger struct {
	// usually, it is considered bad form to wrap a context.Context in a
	// type that gets handed around, but this is what is necessary to
	// do the tracing around a given Neo4J Session
	ctx context.Context

	provider apitrace.TracerProvider
}

// Compile time check that Logger implements the BoltLogger interface
var _ log.BoltLogger = (*Logger)(nil)

// LogServerMessage conforms to the to the neo4j/log.BoltLogger interface
func (l *Logger) LogServerMessage(context string, msg string, args ...interface{}) {
	// too chatty for right now
}

// LogClientMessage conforms to the to the neo4j/log.BoltLogger interface
func (l *Logger) LogClientMessage(context string, msg string, args ...interface{}) {
	// figure out how we want to process a given message based on the first
	// token being treated like a "command"
	fn := defaultFn
	key := strings.Split(msg, " ")[0]
	if overrideFn, ok := processors[key]; ok {
		fn = overrideFn
	}

	// process the message
	attbs, err := fn(msg, args...)
	if err != nil {
		// error is signal that we don't want to log this one
		return
	}

	// add some of the default information we want on everything
	// coming from this package
	attbs = append(
		attbs,
		[]attribute.KeyValue{
			attribute.String("bolt.context", context),
			semconv.DBSystemNeo4j,
		}...,
	)

	// do this as a whole span, rather than an event, so they are
	// visible in Honeycomb as peers along with other DB tracing implementations
	_, span := l.provider.Tracer(tracerName).Start(
		l.ctx, msg, apitrace.WithAttributes(attbs...),
	)
	defer span.End()
}

// for log messages that we find unneccesary or unhelpful, we can squelch them
var skipFn = func(msg string, args ...interface{}) ([]attribute.KeyValue, error) {
	return nil, fmt.Errorf("skip")
}

// for unknown or unexpected messages, let's capture them for now until we decide
// we want to do something else with them
var defaultFn = func(msg string, args ...interface{}) ([]attribute.KeyValue, error) {
	return []attribute.KeyValue{
		attribute.String("bolt.msg", fmt.Sprintf(msg, args...)),
	}, nil
}

// for these known messages, here is how we want to handle them
var processors = map[string]func(string, ...interface{}) ([]attribute.KeyValue, error){
	"<HANDSHAKE>": skipFn,
	"<MAGIC>":     skipFn,
	"BEGIN":       skipFn,
	"HELLO":       skipFn,
	"PULL":        skipFn,
	"ROUTE":       skipFn,
	"RUN": func(msg string, args ...interface{}) ([]attribute.KeyValue, error) {
		// ARGS: for `RUN %q %s %s`
		//  - 0 - cypher; we wanna log this as `db.statement`
		//  - 1 - parameters; unsanitized so we do not want to log this
		//  - 2 - unknown; log it for now
		cypher := ""
		if len(args) >= 1 {
			cypher = fmt.Sprint(args[0])
		}
		unknown := ""
		if len(args) >= 3 {
			unknown = fmt.Sprint(args[2])
		}

		return []attribute.KeyValue{
			attribute.String("bolt.msg", msg),
			attribute.String("bolt.arg2", unknown),
			semconv.DBStatementKey.String(cypher),
		}, nil
	},
}
