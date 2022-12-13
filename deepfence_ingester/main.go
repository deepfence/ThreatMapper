package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path"
	"runtime"
	"strconv"
	"syscall"

	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/kelseyhightower/envconfig"
	_ "github.com/lib/pq"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	logrus "github.com/sirupsen/logrus"
)

var (
	log                      *logrus.Logger
	vulnerabilityProcessor   *BulkProcessor
	complianceProcessor      *BulkProcessor
	cloudComplianceProcessor *BulkProcessor
	secretsProcessor         *BulkProcessor
)

type config struct {
	KafkaBrokers          []string `default:"deepfence-kafka-broker:9092" required:"true" split_words:"true"`
	KafkaTopicPartitions  int32    `default:"1" split_words:"true"`
	KafkaTopicReplicas    int16    `default:"1" split_words:"true"`
	KafkaTopicRetentionMs string   `default:"86400000" split_words:"true"`
	MetricsPort           string   `default:"8181" split_words:"true"`
	Debug                 bool     `default:"false"`
}

func init() {
	// setup logger
	log = logrus.New()
	log.SetLevel(logrus.InfoLevel)
	log.SetOutput(os.Stdout)
	log.SetReportCaller(true)
	log.SetFormatter(&logrus.TextFormatter{
		ForceColors:   true,
		FullTimestamp: true,
		PadLevelText:  true,
		CallerPrettyfier: func(f *runtime.Frame) (string, string) {
			return "", " " + path.Base(f.File) + ":" + strconv.Itoa(f.Line)
		},
	})
}

func main() {

	var cfg config
	var err error
	err = envconfig.Process("DEEPFENCE", &cfg)
	if err != nil {
		log.Fatal(err.Error())
	}

	log.Infof("config: %+v", cfg)

	if cfg.Debug {
		log.SetLevel(logrus.DebugLevel)
	}

	err = checkKafkaConn(cfg.KafkaBrokers)
	if err != nil {
		gracefulExit(err)
	}

	ctx, cancel := signal.NotifyContext(context.Background(),
		os.Interrupt, syscall.SIGTERM)
	defer cancel()

	// for prometheus metrics
	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())
	srv := &http.Server{
		Addr:    fmt.Sprintf("0.0.0.0:%s", cfg.MetricsPort),
		Handler: mux,
	}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Errorf("Server listen failed: %s", err)
		}
	}()
	log.Info("Server Started for metrics")

	// list of kafka topics to fetch messages
	log.Info("topics list: ", utils.Topics)

	//create if any topics is missing
	err = createMissingTopics(
		cfg.KafkaBrokers,
		utils.Topics, cfg.KafkaTopicPartitions,
		cfg.KafkaTopicReplicas, cfg.KafkaTopicRetentionMs)
	if err != nil {
		log.Error(err)
	}

	// start kafka consumers for all given topics
	go startKafkaConsumers(ctx, cfg.KafkaBrokers, utils.Topics, "default")

	// bulk processors
	vulnerabilityProcessor = NewBulkProcessor(utils.VULNERABILITY_SCAN, commitFuncVulnerabilities)
	vulnerabilityProcessor.Start(ctx)

	complianceProcessor = NewBulkProcessor(utils.COMPLIANCE_SCAN, commitFuncCompliance)
	complianceProcessor.Start(ctx)

	cloudComplianceProcessor = NewBulkProcessor(utils.CLOUD_COMPLIANCE_SCAN, commitFuncCloudCompliance)
	cloudComplianceProcessor.Start(ctx)

	secretsProcessor = NewBulkProcessor(utils.SECRET_SCAN, commitFuncSecrets)
	secretsProcessor.Start(ctx)

	// collect consumer lag for metrics
	go getLagByTopic(ctx, cfg.KafkaBrokers, "default")

	// wait for exit
	// flush all data from bulk processor
	<-ctx.Done()

	// stop processors
	vulnerabilityProcessor.Stop()
	complianceProcessor.Stop()
	cloudComplianceProcessor.Stop()
	secretsProcessor.Stop()

	// stop server
	if err := srv.Shutdown(ctx); err != nil {
		log.Errorf("Server Shutdown Failed: %s", err)
	}
	gracefulExit(nil)
}
