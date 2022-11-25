package connection

import (
	"os"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

type ContextID string

type DBEndpoints struct {
	RedisEndpoint string
	Neo4jEndpoint string
	PostgresDB    string
}

var directory map[ContextID]DBEndpoints
var global DBEndpoints

func init() {

	redisEndpoint, has := os.LookupEnv("REDIS_ENDPOINT")
	if !has {
		log.Fatal().Msg("REDIS_ENDPOINT undefined")
	}

	directory = map[ContextID]DBEndpoints{}
	global = DBEndpoints{
		RedisEndpoint: redisEndpoint,
		Neo4jEndpoint: "127.0.0.1:7474",
		PostgresDB:    "127.0.0.1:5432",
	}
}

func GlobalRedisEndpoint() string {
	return global.RedisEndpoint
}
