package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/deepfence/ThreatMapper/deepfence_worker/processors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func startIngester(cfg config) error {

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
		log.Info().Msgf("Start metrics server at %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error().Msgf("Server listen failed: %s", err)
		}
	}()

	// list of kafka topics to fetch messages
	log.Info().Msgf("topics list: %v", utils.Topics)

	//create if any topics is missing
	err := utils.CreateMissingTopics(
		cfg.KafkaBrokers, utils.Topics,
		cfg.KafkaTopicPartitions, cfg.KafkaTopicReplicas, cfg.KafkaTopicRetentionMs,
	)
	if err != nil {
		log.Error().Msgf("%v", err)
	}

	// bulk processors
	processors.StartKafkaProcessors(ctx)

	// start audit log processor
	err = processors.StartAuditLogProcessor(ctx)
	if err != nil {
		log.Error().Msgf("%v", err)
	}

	// start kafka consumers for all given topics
	err = processors.StartKafkaConsumers(
		ctx, cfg.KafkaBrokers, utils.Topics, "default", utils.KgoLogger,
	)
	if err != nil {
		return err
	}

	// collect consumer lag for metrics
	err = processors.StartGetLagByTopic(
		ctx, cfg.KafkaBrokers, "default", utils.KgoLogger)
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

	return nil
}
