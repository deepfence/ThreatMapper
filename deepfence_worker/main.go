package main

import (
	"errors"
	"os"
	"os/signal"

	"github.com/deepfence/ThreatMapper/deepfence_worker/router"
	"github.com/hibiken/asynq"
	"github.com/sirupsen/logrus"
)

type Config struct {
	RedisEndpoint string
	RedisDb       string
}

func main() {
	customFormatter := new(logrus.TextFormatter)
	customFormatter.TimestampFormat = "2006-01-02 15:04:05"
	logrus.SetFormatter(customFormatter)
	customFormatter.FullTimestamp = true

	logrus.Info("starting deepfence-worker")

	config, err := initialize()
	if err != nil {
		logrus.Fatalf("Initialize failed: %v", err)
	}

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: config.RedisEndpoint},
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
		},
	)

	r := asynq.NewServeMux()
	router.SetupRoutes(r)

	idleConnectionsClosed := make(chan struct{})
	go func() {
		sigint := make(chan os.Signal, 1)
		signal.Notify(sigint, os.Interrupt)
		<-sigint
		srv.Shutdown()
		close(idleConnectionsClosed)
	}()

	if err := srv.Run(r); err != nil {
		logrus.Errorf("Server run error: %v", err)
	}

	<-idleConnectionsClosed

	logrus.Info("deepfence-worker stopped")
}

func initialize() (Config, error) {

	redisEndpoint, has := os.LookupEnv("REDIS_ENDPOINT")
	if !has {
		return Config{}, errors.New("REDIS_ENDPOINT undefined")
	}

	redisDb, has := os.LookupEnv("REDIS_DB_NUMBER")
	if !has {
		return Config{}, errors.New("REDIS_DB_NUMBER undefined")
	}

	return Config{
		RedisEndpoint: redisEndpoint,
		RedisDb:       redisDb,
	}, nil
}
