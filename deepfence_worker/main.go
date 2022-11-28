package main

import (
	"os"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_worker/router"
	"github.com/hibiken/asynq"
)

func main() {

	log.Info().Msgf("starting deepfence-worker")

	ctx := directory.NewGlobalContext()
	redisConfig, err := directory.GetRedisConfig(ctx)
	if err != nil {
		log.Fatal().Msgf("Directory error: %v", err)
	}
	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisConfig.Endpoint},
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
			Logger: log.AsynqLogger{},
		},
	)

	r := asynq.NewServeMux()
	router.SetupRoutes(r)

	if err := srv.Run(r); err != nil {
		log.Fatal().Msgf("Server run error: %v", err)
	}

	log.Info().Msg("deepfence-worker stopped")
}

func init() {

	verbosity, _ := os.LookupEnv("WORKER_LOG_LEVEL")

	log.Initialize(verbosity)
}
