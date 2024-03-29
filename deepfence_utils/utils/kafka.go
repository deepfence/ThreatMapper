package utils

import (
	"context"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/rs/zerolog"
	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"
)

// kafka client logger
var (
	KgoLogger kgo.Logger = kgo.BasicLogger(log.NewIOWriter(zerolog.InfoLevel), kgo.LogLevelInfo, nil)
)

func CheckKafkaConn(kafkaBrokers []string) error {
	opts := []kgo.Opt{
		kgo.SeedBrokers(kafkaBrokers...),
		kgo.WithLogger(KgoLogger),
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

func CreateMissingTopics(
	kafkaBrokers []string,
	topics []string,
	partitions int32,
	replicas int16,
	retentionMS string,
) error {

	log.Info().Msgf("create topics with partitions=%d and replicas=%d", partitions, replicas)

	opts := []kgo.Opt{
		kgo.SeedBrokers(kafkaBrokers...),
		kgo.WithLogger(KgoLogger),
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
		"retention.ms": kadm.StringPtr(retentionMS),
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

func StartKafkaProducer(
	ctx context.Context,
	brokers []string,
	ingestChan chan *kgo.Record,
) {

	opts := []kgo.Opt{
		kgo.SeedBrokers(brokers...),
		kgo.WithLogger(KgoLogger),
		kgo.UnknownTopicRetries(3),
		kgo.RecordRetries(10),
		kgo.AutoCommitInterval(1 * time.Second),
	}

	kClient, err := kgo.NewClient(opts...)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	defer kClient.Close()

	if err := kClient.Ping(ctx); err != nil {
		log.Error().Msg(err.Error())
	}

	for {
		select {
		case <-ctx.Done():
			log.Info().Msg("stop producing to kafka")
			if err := kClient.Flush(context.Background()); err != nil {
				log.Error().Msg(err.Error())
			}
			return

		case record := <-ingestChan:
			kClient.Produce(
				ctx,
				record,
				func(r *kgo.Record, err error) {
					if err != nil {
						log.Error().Msgf(
							"failed to produce record %s record: %v",
							err, record,
						)
					}
				},
			)
		}
	}
}
