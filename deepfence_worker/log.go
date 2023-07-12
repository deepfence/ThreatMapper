package main

import (
	"github.com/ThreeDotsLabs/watermill"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

type zerologWaterMillAdapter struct {
	fields       map[string]interface{}
	debug, trace bool
}

func NewZerologWaterMillAdapter(debug, trace bool) *zerologWaterMillAdapter {
	return &zerologWaterMillAdapter{
		fields: map[string]interface{}{},
		debug:  debug,
		trace:  trace,
	}
}

func (zerologWaterMillAdapter) Error(msg string, err error, fields watermill.LogFields) {
	log.Error().CallerSkipFrame(2).Fields(fields).Err(err).Msg(msg)
}
func (zerologWaterMillAdapter) Info(msg string, fields watermill.LogFields) {
	log.Info().CallerSkipFrame(2).Fields(fields).Msg(msg)
}
func (z zerologWaterMillAdapter) Debug(msg string, fields watermill.LogFields) {
	if z.debug {
		log.Debug().CallerSkipFrame(2).Fields(fields).Msg(msg)
	}
}
func (z zerologWaterMillAdapter) Trace(msg string, fields watermill.LogFields) {
	if z.trace {
		log.Trace().CallerSkipFrame(2).Fields(fields).Msg(msg)
	}
}
func (z zerologWaterMillAdapter) With(fields watermill.LogFields) watermill.LoggerAdapter {
	for k, v := range fields {
		z.fields[k] = v
	}
	return z
}
