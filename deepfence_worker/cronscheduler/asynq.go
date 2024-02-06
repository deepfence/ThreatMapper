package cronscheduler

import (
	"context"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

type AsynqQueueState struct {
	namespace directory.NamespaceID
	timeout   time.Duration
}

func NewAsynqQueueState(ns directory.NamespaceID, timeout time.Duration) *AsynqQueueState {
	return &AsynqQueueState{namespace: ns, timeout: timeout}
}

func (qs *AsynqQueueState) Run() {

	ctx := directory.NewContextWithNameSpace(qs.namespace)

	log := log.WithCtx(ctx)

	configs, err := directory.GetDatabaseConfig(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get db configs")
		return
	}
	hostPort := strings.Split(configs.Neo4j.Endpoint, ":")
	if len(hostPort) != 3 {
		log.Error().Msgf("Invalid neo4j endpoint %v", configs.Neo4j.Endpoint)
		return
	}
	err = utils.WaitServiceTCPConn(hostPort[1][2:], hostPort[2], qs.timeout)
	if err != nil {
		log.Warn().Msgf("pause queues neo4j not reachable %s", err)
		AsynqPauseQueues(ctx)
	} else {
		log.Warn().Msgf("unpause queues neo4j reachable")
		AsynqUnpauseQueues(ctx)
	}

}

func AsynqPauseQueues(ctx context.Context) error {

	log := log.WithCtx(ctx)

	worker, err := directory.Worker(ctx)
	if err != nil {
		log.Error().Err(err).Msgf("failed to get worker instance")
		return err
	}

	queues, err := worker.Inspector().Queues()
	if err != nil {
		log.Error().Err(err).Msgf("failed to get worker queues")
		return err
	}

	for _, q := range queues {
		if info, err := worker.Inspector().GetQueueInfo(q); err != nil {
			log.Error().Err(err).Msgf("failed to get queue info %s", q)
		} else {
			if !info.Paused {
				log.Warn().Msgf("pause worker queue %s", q)
				if err := worker.Inspector().PauseQueue(q); err != nil {
					log.Error().Err(err).Msgf("failed to pause worker queue %s", q)
				}
			}
		}
	}
	return nil
}

func AsynqUnpauseQueues(ctx context.Context) error {

	log := log.WithCtx(ctx)

	worker, err := directory.Worker(ctx)
	if err != nil {
		log.Error().Err(err).Msgf("failed to get worker instance")
		return err
	}

	queues, err := worker.Inspector().Queues()
	if err != nil {
		log.Error().Err(err).Msgf("failed to get worker queues")
		return err
	}

	for _, q := range queues {
		if info, err := worker.Inspector().GetQueueInfo(q); err != nil {
			log.Error().Err(err).Msgf("failed to get queue info %s", q)
		} else {
			if info.Paused {
				log.Warn().Msgf("unpause worker queue %s", q)
				if err := worker.Inspector().UnpauseQueue(q); err != nil {
					log.Error().Err(err).Msgf("failed to unpause worker queue %s", q)
				}
			}
		}
	}
	return nil
}
