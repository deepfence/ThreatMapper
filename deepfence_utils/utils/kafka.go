package utils

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/twmb/franz-go/pkg/kgo"
)

// kafka client logger
var (
	KgoLogger kgo.Logger = kgo.BasicLogger(&log.LogInfoWriter{}, kgo.LogLevelInfo, nil)
)

func StartKafkaProducer(
	ctx context.Context,
	brokers []string,
	ingestChan chan *kgo.Record,
) {

	opts := []kgo.Opt{
		kgo.SeedBrokers(brokers...),
		kgo.WithLogger(KgoLogger),
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
