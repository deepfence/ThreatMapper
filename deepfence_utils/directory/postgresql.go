package directory

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	_ "github.com/lib/pq"
)

var postgresClientsPool map[NamespaceID]*postgresqlDb.Queries

func init() {
	postgresClientsPool = map[NamespaceID]*postgresqlDb.Queries{}
}

func newPostgresClient(endpoints DBConfigs) (*postgresqlDb.Queries, error) {
	if endpoints.Postgres == nil {
		return nil, errors.New("No defined Neo4j config")
	}
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		endpoints.Postgres.Host, endpoints.Postgres.Port, endpoints.Postgres.Username, endpoints.Postgres.Password, endpoints.Postgres.Database, endpoints.Postgres.SslMode)
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		return nil, err
	}
	return postgresqlDb.New(db), nil
}

func PostgresClient(ctx context.Context) (*postgresqlDb.Queries, error) {
	driver, err := get_client(ctx, postgresClientsPool, newPostgresClient)
	if err != nil {
		return nil, err
	}
	return driver, err
}
