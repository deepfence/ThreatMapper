package processors

import (
	"context"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	wtils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/twmb/franz-go/pkg/kgo"
)

type Ingester struct {
	cfg        wtils.Config
	namespace  directory.NamespaceID
	topics     []string
	processors map[string]*BulkProcessor
	auditC     chan *kgo.Record
	stop       context.CancelFunc
}

func NewIngester(ns directory.NamespaceID, cfg wtils.Config, cancel context.CancelFunc) (Ingester, error) {

	ing := Ingester{
		cfg:        cfg,
		namespace:  ns,
		topics:     utils.TopicsWithNamespace(string(ns)),
		processors: NewKafkaProcessors(string(ns)),
		auditC:     make(chan *kgo.Record, 1000),
		stop:       cancel,
	}

	log.Info().Msgf("topics %s", ing.topics)

	// create if any topics is missing
	err := utils.CreateMissingTopics(cfg.KafkaBrokers, ing.topics,
		cfg.KafkaTopicPartitions, cfg.KafkaTopicReplicas, cfg.KafkaTopicRetentionMs,
	)
	if err != nil {
		log.Error().Msgf("%v", err)
	}

	return ing, nil
}

func (i *Ingester) Start(ctx context.Context) {

	ctx = directory.NewContextWithNameSpace(i.namespace)

	err := StartGetLagByTopic(ctx, i.cfg.KafkaBrokers, string(i.namespace), utils.KgoLogger)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	err = i.StartKafkaConsumers(ctx, utils.KgoLogger)
	if err != nil {
		log.Panic().Msg(err.Error())
	}
	err = i.StartAuditLogProcessor(ctx)
	if err != nil {
		log.Panic().Msg(err.Error())
	}
	for p := range i.processors {
		err := i.processors[p].Start(ctx)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func (i *Ingester) Stop() {
	i.stop()
	for p := range i.processors {
		err := i.processors[p].Stop()
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func (i *Ingester) StartKafkaConsumers(ctx context.Context, kgoLogger kgo.Logger) error {

	log := log.WithCtx(ctx)

	log.Info().Msgf("brokers: %v", i.cfg.KafkaBrokers)
	log.Info().Msgf("topics: %v", i.topics)
	log.Info().Msgf("group ID: %v", i.namespace)

	opts := []kgo.Opt{
		kgo.SeedBrokers(i.cfg.KafkaBrokers...),
		kgo.ConsumerGroup(string(i.namespace)),
		kgo.ConsumeTopics(i.topics...),
		kgo.ClientID(string(i.namespace)),
		kgo.FetchMinBytes(1e3),
		kgo.WithLogger(kgoLogger),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
	}

	kc, err := kgo.NewClient(opts...)
	if err != nil {
		return err
	}

	if err := kc.Ping(ctx); err != nil {
		kc.Close()
		return err
	}

	go func() {
		defer kc.Close()
		i.pollRecords(ctx, kc)
	}()

	return nil
}

func (i *Ingester) pollRecords(ctx context.Context, kc *kgo.Client) {

	log := log.WithCtx(ctx)

	ticker := time.NewTicker(5 * time.Second)
	for {
		select {
		case <-ctx.Done():
			log.Info().Msgf("stop consuming from kafka for ns %s", i.namespace)
			return
		case <-ticker.C:
			records := kc.PollRecords(ctx, 20_000)
			records.EachRecord(i.processRecord)
			records.EachError(
				func(s string, i int32, err error) {
					log.Error().Msgf("topic=%s partition=%d error: %s", s, i, err)
				},
			)
		}
	}
}

func (i *Ingester) processRecord(r *kgo.Record) {
	switch r.Topic {
	case utils.TopicWithNamespace(utils.AuditLogs, string(i.namespace)):
		i.AddAuditLog(r)
	default:
		processor, exists := i.processors[r.Topic]
		if !exists {
			log.Error().Msgf("Not Implemented for topic %s", r.Topic)
			return
		}

		err := Process(processor, string(i.namespace), r.Value)
		if err != nil {
			log.Error().Msgf("Process err: %s", err)
		}
	}
}
