package directory

import (
	"os"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

const (
	GLOBAL_DIR_KEY  = NamespaceID("global")
	NONSAAS_DIR_KEY = NamespaceID("default")

	NAMESPACE_KEY = "namespace"
)

type NamespaceID string
type RedisAddr string
type Neo4jAddr string
type PosgresAddr string

type DBEndpoints struct {
	RedisEndpoint RedisAddr
	Neo4jEndpoint Neo4jAddr
	PostgresDB    PosgresAddr
}

var directory map[NamespaceID]DBEndpoints

func init() {
	redisEndpoint, has := os.LookupEnv("REDIS_ENDPOINT")
	if !has {
		log.Fatal().Msg("REDIS_ENDPOINT undefined")
	}

	directory = map[NamespaceID]DBEndpoints{}
	directory[GLOBAL_DIR_KEY] = DBEndpoints{
		RedisEndpoint: RedisAddr(redisEndpoint),
		Neo4jEndpoint: "127.0.0.1:7474",
		PostgresDB:    "127.0.0.1:5432",
	}
}
