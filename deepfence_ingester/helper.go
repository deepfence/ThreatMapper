package main

import (
	"context"
	"encoding/json"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"
)

func getCurrentTime() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000") + "Z"
}

var kgoLogger kgo.Logger = kgo.BasicLogger(
	os.Stdout,
	kgo.LogLevelInfo,
	func() string { return "[" + getCurrentTime() + "]" + " " },
)

func checkKafkaConn() error {
	opts := []kgo.Opt{
		kgo.SeedBrokers(strings.Split(kafkaBrokers, ",")...),
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
	log.Info("connection successful to kafka brokers " + kafkaBrokers)
	return nil
}

func createMissingTopics(topics []string, partitions int32, replicas int16, retention_ms string) error {
	log.Infof("create topics with partitions=%d and replicas=%d", partitions, replicas)

	opts := []kgo.Opt{
		kgo.SeedBrokers(strings.Split(kafkaBrokers, ",")...),
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
		log.Error(err)
		return err
	}
	for _, r := range resp.Sorted() {
		if r.Err != nil {
			log.Errorf("topic: %s error: %s", r.Topic, r.Err)
		}
	}
	return nil
}

func gracefulExit(err error) {
	if err != nil {
		log.Error(err)
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
