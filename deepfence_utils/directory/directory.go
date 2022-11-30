package directory

import (
	"os"
	"strconv"

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
	Host     string
	Port     int
	Username string
	Password string
	Database string
	SslMode  string
}

type DBConfigs struct {
	Redis    *RedisConfig
	Neo4j    *Neo4jConfig
	Postgres *PosgresConfig
}

var directory map[NamespaceID]DBConfigs

func init() {
	redisHost, has := os.LookupEnv("REDIS_HOST")
	if !has {
		redisHost = "localhost"
		log.Warn().Msgf("REDIS_HOST defaults to: %v", redisHost)
	}
	redisPort, has := os.LookupEnv("REDIS_PORT")
	if !has {
		redisPort = "6379"
		log.Warn().Msgf("REDIS_PORT defaults to: %v", redisPort)
	}
	redisEndpoint := redisHost + ":" + redisPort
	redisPassword := os.Getenv("REDIS_PASSWORD")
	redisDbNumber := 0
	var err error
	redisDbNumberStr := os.Getenv("REDIS_DB_NUMBER")
	if redisDbNumberStr != "" {
		redisDbNumber, err = strconv.Atoi(redisDbNumberStr)
		if err != nil {
			redisDbNumber = 0
		}
	}

	postgresHost, has := os.LookupEnv("POSTGRES_USER_DB_HOST")
	if !has {
		postgresHost = "localhost"
		log.Warn().Msgf("POSTGRES_USER_DB_HOST defaults to: %v", postgresHost)
	}
	postgresPort := 5432
	postgresPortStr := os.Getenv("POSTGRES_USER_DB_PORT")
	if postgresPortStr == "" {
		log.Warn().Msgf("POSTGRES_USER_DB_PORT defaults to: %d", postgresPort)
	} else {
		postgresPort, err = strconv.Atoi(postgresPortStr)
		if err != nil {
			postgresPort = 5432
		}
	}
	postgresUsername := os.Getenv("POSTGRES_USER_DB_USER")
	postgresPassword := os.Getenv("POSTGRES_USER_DB_PASSWORD")
	postgresDatabase := os.Getenv("POSTGRES_USER_DB_NAME")
	postgresSslMode := os.Getenv("POSTGRES_USER_DB_SSLMODE")

	neo4jHost, has := os.LookupEnv("NEO4J_HOST")
	if !has {
		neo4jHost = "localhost"
		log.Warn().Msgf("NEO4J_HOST defaults to: %v", neo4jHost)
	}
	neo4jBoltPort, has := os.LookupEnv("NEO4J_BOLT_PORT")
	if !has {
		neo4jBoltPort = "7687"
		log.Warn().Msgf("NEO4J_BOLT_PORT defaults to: %v", neo4jBoltPort)
	}
	neo4jEndpoint := "bolt://" + neo4jHost + ":" + neo4jBoltPort
	neo4jUsername := os.Getenv("NEO4J_USER")
	neo4jPassword := os.Getenv("NEO4J_PASSWORD")

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
			Redis: &RedisConfig{
				Endpoint: redisEndpoint,
				Password: redisPassword,
				Database: redisDbNumber,
			},
			Neo4j: &Neo4jConfig{
				Endpoint: neo4jEndpoint,
				Username: neo4jUsername,
				Password: neo4jPassword,
			},
			Postgres: nil,
		}
	}

	directory[GLOBAL_DIR_KEY] = DBConfigs{
		Redis: &RedisConfig{
			Endpoint: redisEndpoint,
			Password: redisPassword,
			Database: redisDbNumber,
		},
		Neo4j: nil,
		Postgres: &PosgresConfig{
			Host:     postgresHost,
			Port:     postgresPort,
			Username: postgresUsername,
			Password: postgresPassword,
			Database: postgresDatabase,
			SslMode:  postgresSslMode,
		},
	}
}
