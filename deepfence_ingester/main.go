package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/deepfence/ThreatMapper/deepfence_ingester/processors"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/kelseyhightower/envconfig"
	_ "github.com/lib/pq"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type config struct {
	KafkaBrokers          []string `default:"deepfence-kafka-broker:9092" required:"true" split_words:"true"`
	KafkaTopicPartitions  int32    `default:"1" split_words:"true"`
	KafkaTopicReplicas    int16    `default:"1" split_words:"true"`
	KafkaTopicRetentionMs string   `default:"86400000" split_words:"true"`
	MetricsPort           string   `default:"8181" split_words:"true"`
	Debug                 bool     `default:"false"`
}

func main() {

	var cfg config
	var err error
	err = envconfig.Process("DEEPFENCE", &cfg)
	if err != nil {
		log.Fatal().Msg(err.Error())
	}

	log.Info().Msgf("config: %+v", cfg)

	if cfg.Debug {
		log.Initialize("debug")
	} else {
		log.Initialize("info")
	}

	err = checkKafkaConn(cfg.KafkaBrokers)
	if err != nil {
		gracefulExit(err)
	}

	log.Info().Msgf("connection successful to kafka brokers %v", cfg.KafkaBrokers)

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
			log.Error().Msgf("Server listen failed: %s", err)
		}
	}()
	log.Info().Msg("Server Started for metrics")

	// list of kafka topics to fetch messages
	log.Info().Msgf("topics list: %v", utils.Topics)

	//create if any topics is missing
	err = createMissingTopics(
		cfg.KafkaBrokers,
		utils.Topics, cfg.KafkaTopicPartitions,
		cfg.KafkaTopicReplicas, cfg.KafkaTopicRetentionMs)
	if err != nil {
		log.Error().Msgf("%v", err)
	}

	// bulk processors
	processors.StartKafkaProcessors(ctx)

	// start kafka consumers for all given topics
	err = processors.StartKafkaConsumers(ctx, cfg.KafkaBrokers, utils.Topics, "default", kgoLogger)
	if err != nil {
		log.Error().Msgf("%v", err)
	}

	// collect consumer lag for metrics
	err = processors.StartGetLagByTopic(ctx, cfg.KafkaBrokers, "default", kgoLogger)
	if err != nil {
		log.Error().Msgf("Metrics failed: %v, continuing", err)
	}

	// wait for exit
	// flush all data from bulk processor
	<-ctx.Done()

	// stop processors
	processors.StopKafkaProcessors()

	// stop server
	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Msgf("Server Shutdown Failed: %s", err)
	}

	gracefulExit(nil)
}
