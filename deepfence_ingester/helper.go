package main

import (
	"context"
	"encoding/json"
	"os"
	"strconv"
	"time"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

var kgoLogger kgo.Logger = kgo.BasicLogger(
	log.LogInfoWriter{},
	kgo.LogLevelInfo,
	nil,
)

func checkKafkaConn(kafkaBrokers []string) error {
	opts := []kgo.Opt{
		kgo.SeedBrokers(kafkaBrokers...),
		kgo.WithLogger(kgoLogger),
	}
	kClient, err := kgo.NewClient(opts...)
	if err != nil {
		return err
	}
	defer kClient.Close()
	if err := kClient.Ping(context.Background()); err != nil {
		return err
	}
	return nil
}

func createMissingTopics(kafkaBrokers []string, topics []string,
	partitions int32, replicas int16, retention_ms string) error {
	log.Info().Msgf("create topics with partitions=%d and replicas=%d", partitions, replicas)

	opts := []kgo.Opt{
		kgo.SeedBrokers(kafkaBrokers...),
		kgo.WithLogger(kgoLogger),
	}
	kClient, err := kgo.NewClient(opts...)
	if err != nil {
		return err
	}
	defer kClient.Close()
	if err := kClient.Ping(context.Background()); err != nil {
		return err
	}

	adminClient := kadm.NewClient(kClient)
	defer adminClient.Close()

	topicConfig := map[string]*string{
		"retention.ms": kadm.StringPtr(retention_ms),
	}

	resp, err := adminClient.CreateTopics(context.Background(),
		partitions, replicas, topicConfig, topics...)
	if err != nil {
		return err
	}
	for _, r := range resp.Sorted() {
		if r.Err != nil {
			log.Error().Msgf("topic: %s error: %s", r.Topic, r.Err)
		}
	}
	return nil
}

func gracefulExit(err error) {
	if err != nil {
		log.Error().Msgf("%v", err)
	}

	time.Sleep(time.Second * 5)
	os.Exit(1)
}

func toJSON(d interface{}) string {
	// s, _ := json.MarshalIndent(d, "", "  ")
	s, _ := json.Marshal(d)
	return string(s)
}

func GetEnvStringWithDefault(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func GetEnvIntWithDefault(key string, fallback int) int {
	if value, exists := os.LookupEnv(key); exists {
		if v, err := strconv.Atoi(value); err != nil {
			return fallback
		} else {
			return v
		}
	}
	return fallback
}
