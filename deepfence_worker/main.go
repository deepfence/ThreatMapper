package main

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_worker/router"
	"github.com/hibiken/asynq"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type Config struct {
	RedisEndpoint string
	RedisDb       string
}

type AsynqLogger struct{}

func (a AsynqLogger) Debug(args ...interface{}) {
	log.Debug().Msg(fmt.Sprint(args...))
}

func (a AsynqLogger) Info(args ...interface{}) {
	log.Info().Msg(fmt.Sprint(args...))
}

func (a AsynqLogger) Warn(args ...interface{}) {
	log.Warn().Msg(fmt.Sprint(args...))
}

func (a AsynqLogger) Error(args ...interface{}) {
	log.Error().Msg(fmt.Sprint(args...))
}

func (a AsynqLogger) Fatal(args ...interface{}) {
	log.Fatal().Msg(fmt.Sprint(args...))
}

func main() {

	config, err := initialize()
	if err != nil {
		log.Fatal().Msgf("Initialize failed: %v", err)
	}

	log.Info().Msgf("starting deepfence-worker")

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: config.RedisEndpoint},
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
			Logger: AsynqLogger{},
		},
	)

	r := asynq.NewServeMux()
	router.SetupRoutes(r)

	if err := srv.Run(r); err != nil {
		log.Fatal().Msgf("Server run error: %v", err)
	}

	log.Info().Msg("deepfence-worker stopped")
}

func initialize() (Config, error) {

	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC1123Z})

	verbosity, _ := os.LookupEnv("WORKER_LOG_LEVEL")

	switch verbosity {
	case zerolog.LevelTraceValue:
		zerolog.SetGlobalLevel(zerolog.TraceLevel)
	case zerolog.LevelDebugValue:
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case zerolog.LevelInfoValue:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case zerolog.LevelWarnValue:
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case zerolog.LevelErrorValue:
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	case zerolog.LevelFatalValue:
		zerolog.SetGlobalLevel(zerolog.FatalLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

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
