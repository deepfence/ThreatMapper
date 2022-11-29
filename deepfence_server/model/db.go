package model

import (
	"database/sql"
	"fmt"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"os"
	"strconv"
)

type PostgresDBConn struct {
	Queries *postgresqlDb.Queries
}

func NewPostgresDBConnection() (*PostgresDBConn, error) {
	postgresPort := 5432
	var err error
	postgresPortStr := os.Getenv("POSTGRES_USER_DB_PORT")
	if postgresPortStr != "" {
		postgresPort, err = strconv.Atoi(postgresPortStr)
		if err != nil {
			postgresPort = 5432
		}
	}
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("POSTGRES_USER_DB_HOST"), postgresPort, os.Getenv("POSTGRES_USER_DB_USER"),
		os.Getenv("POSTGRES_USER_DB_PASSWORD"), os.Getenv("POSTGRES_USER_DB_NAME"),
		os.Getenv("POSTGRES_USER_DB_SSLMODE"))
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		return nil, err
	}
	return &PostgresDBConn{
		Queries: postgresqlDb.New(db),
	}, nil
}
