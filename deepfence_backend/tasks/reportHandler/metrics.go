package main

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	pubElasticSearchSuccess = promauto.NewCounter(prometheus.CounterOpts{
		Name: "publish_es_success",
		Help: "Total number of records sent successfully to elasticsearch",
	})
	pubElasticSearchFailed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "publish_es_failed",
		Help: "Total number of records failed to be sent to elasticsearch",
	})
	cveMasked = promauto.NewCounter(prometheus.CounterOpts{
		Name: "cve_masked",
		Help: "Total number of cve records masked",
	})
	cveProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "cve_scan",
		Help: "Total number of cve records processed",
	})
	cveLogsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "cve_scan_logs",
		Help: "Total number of cve log records processed",
	})
	secretProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "secret_scan",
		Help: "Total number of secret scan records processed",
	})
	secretLogsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "secret_scan_logs",
		Help: "Total number of secret scan log records processed",
	})
	sbomArtifactsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "sbom_artifacts",
		Help: "Total number of sbom artifacts processed",
	})
	sbomCveProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "sbom_cve",
		Help: "Total number of sbom cve records processed",
	})
	cloudComplianceProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "cloud_compliance_scan",
		Help: "Total number of cloud compliance scan records processed",
	})
	cloudComplianceLogsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "cloud_compliance_scan_logs",
		Help: "Total number of cloud compliance scan log records processed",
	})
	complianceProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "compliance_scan",
		Help: "Total number of compliance scan records processed",
	})
	complianceLogsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "compliance_scan_logs",
		Help: "Total number of compliance scan log records processed",
	})
)
