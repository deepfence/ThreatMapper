package main

import (
	"github.com/deepfence/ThreatMapper/deepfence_worker/processors"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

func NewMetrics(mode string) *prometheus.Registry {
	registry := prometheus.NewRegistry()
	// Add go runtime metrics and process collectors.
	registry.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
	)

	if mode == "ingester" {
		// register prometheus metrics collectors
		registry.MustRegister(processors.CommitNeo4jRecordsCounts, processors.KafkaTopicsLag)
	}

	return registry
}
