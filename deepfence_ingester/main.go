package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"path"
	"runtime"
	"strconv"
	"strings"
	"syscall"

	_ "github.com/lib/pq"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	logrus "github.com/sirupsen/logrus"
)

var (
	kafkaBrokers             string
	log                      *logrus.Logger
	cveProcessor             *BulkProcessor
	complianceProcessor      *BulkProcessor
	cloudComplianceProcessor *BulkProcessor
	secretsProcessor         *BulkProcessor
)

// func funcName(fname string) string {
// 	if strings.Contains(fname, ".") {
// 		s := strings.Split(fname, ".")
// 		return s[len(s)-1]
// 	}
// 	return fname
// }

func init() {

	// setup logger
	log = logrus.New()
	debug := os.Getenv("DEBUG")
	if strings.ToLower(debug) == "true" {
		log.SetLevel(logrus.DebugLevel)
	} else {
		log.SetLevel(logrus.InfoLevel)
	}
	log.SetOutput(os.Stdout)
	log.SetReportCaller(true)
	log.SetFormatter(&logrus.TextFormatter{
		ForceColors:   true,
		FullTimestamp: true,
		PadLevelText:  true,
		CallerPrettyfier: func(f *runtime.Frame) (string, string) {
			// return funcName(f.Func.Name()) + "()", " " + path.Base(f.File) + ":" + strconv.Itoa(f.Line)
			return "", " " + path.Base(f.File) + ":" + strconv.Itoa(f.Line)
		},
	})

	kafkaBrokers = os.Getenv("KAFKA_BROKERS")
	if kafkaBrokers == "" {
		kafkaBrokers = "deepfence-kafka-broker:9092"
	}
	err := checkKafkaConn()
	if err != nil {
		gracefulExit(err)
	}
}

func main() {

	ctx, cancel := signal.NotifyContext(context.Background(),
		os.Interrupt, syscall.SIGTERM)
	defer cancel()

	// for prometheus metrics
	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())
	srv := &http.Server{Addr: "0.0.0.0:8181", Handler: mux}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Errorf("Server listen failed: %s", err)
		}
	}()
	log.Info("Server Started for metrics")

	// list of kafka topics to fetch messages
	topics := []string{
		cve, cveScanLogs,
		secretScan, secretScanLogs,
		malwareScan, malwareScanLogs,
		sbomArtifacts, sbomCVEScan,
		cloudComplianceScan, cloudComplianceScanLogs,
		complianceScan, complianceScanLogs,
		cloudTrailAlerts,
	}
	log.Info("topics list: ", topics)

	//create if any topics is missing
	partitions := GetEnvIntWithDefault("KAFKA_TOPIC_PARTITIONS", 1)
	replicas := GetEnvIntWithDefault("KAFKA_TOPIC_REPLICAS", 1)
	retention_ms := GetEnvStringWithDefault("KAFKA_TOPIC_RETENTION_MS", "86400000")
	err := createMissingTopics(topics, int32(partitions), int16(replicas), retention_ms)
	if err != nil {
		log.Error(err)
	}

	// channels to pass message between report processor and consumer
	topicChannels := make(map[string](chan []byte))
	for _, t := range topics {
		topicChannels[t] = make(chan []byte, 1000)
	}

	go startKafkaConsumers(ctx, kafkaBrokers, topics, "default")

	// bulk processors
	cveProcessor = NewBulkProcessor("cve", commitFuncCVEs)
	cveProcessor.Start(ctx)

	complianceProcessor = NewBulkProcessor("compliance", commitFuncCompliance)
	complianceProcessor.Start(ctx)

	cloudComplianceProcessor = NewBulkProcessor("cloud-compliance", commitFuncCloudCompliance)
	cloudComplianceProcessor.Start(ctx)

	secretsProcessor = NewBulkProcessor("secrets", commitFuncSecrets)
	secretsProcessor.Start(ctx)

	// collect consumer lag for metrics
	go getLagByTopic(ctx, kafkaBrokers, "default")

	// wait for exit
	// flush all data from bulk processor
	<-ctx.Done()

	// stop processors
	cveProcessor.Stop()
	complianceProcessor.Stop()
	cloudComplianceProcessor.Stop()
	secretsProcessor.Stop()

	// stop server
	if err := srv.Shutdown(ctx); err != nil {
		log.Errorf("Server Shutdown Failed: %s", err)
	}
	gracefulExit(nil)
}
