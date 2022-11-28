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

type RedisConfig struct {
	Endpoint string
	Password string
	Database int
}

type Neo4jConfig struct {
	Endpoint string
	Username string
	Password string
}

type PosgresConfig struct {
	Endpoint string
	Username string
	Password string
	Database string
}

type DBConfigs struct {
	Redis    RedisConfig
	Neo4j    *Neo4jConfig
	Postgres PosgresConfig
}

var directory map[NamespaceID]DBConfigs

func init() {
	redisEndpoint, has := os.LookupEnv("REDIS_ENDPOINT")
	if !has {
		redisEndpoint = "localhost:6379"
		log.Warn().Msgf("REDIS_ENDPOINT defaults to: %v", redisEndpoint)
	}

	saasMode := false
	saasModeOn, has := os.LookupEnv("SAAS_MODE")
	if !has {
		log.Warn().Msg("SAAS_MODE defaults to: off")
	} else if saasModeOn == "on" {
		saasMode = true
	}

	directory = map[NamespaceID]DBConfigs{}

	if !saasMode {
		directory[NONSAAS_DIR_KEY] = DBConfigs{
			Redis: RedisConfig{
				Endpoint: redisEndpoint,
				Password: "",
				Database: 0,
			},
			Neo4j: &Neo4jConfig{
				Endpoint: "bolt://localhost:7687",
				Username: "neo4j",
				Password: "password",
			},
			Postgres: PosgresConfig{
				Endpoint: "localhost:5432",
				Username: "",
				Password: "",
				Database: "default",
			},
		}
	}

	directory[GLOBAL_DIR_KEY] = DBConfigs{
		Redis: RedisConfig{
			Endpoint: redisEndpoint,
			Password: "",
			Database: 0,
		},
		Neo4j: nil,
		Postgres: PosgresConfig{
			Endpoint: "localhost:5432",
			Username: "",
			Password: "",
			Database: "global",
		},
	}
}
