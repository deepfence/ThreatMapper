package main

import (
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
	"os"
	"strconv"
)

func main() {
	var err error
	postgresPort := 5432
	postgresPortStr := os.Getenv("POSTGRES_FETCHER_DB_PORT")
	if postgresPortStr != "" {
		postgresPort, err = strconv.Atoi(postgresPortStr)
		if err != nil {
			postgresPort = 5432
		}
	}
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("POSTGRES_FETCHER_DB_HOST"), postgresPort, os.Getenv("POSTGRES_FETCHER_DB_USER"),
		os.Getenv("POSTGRES_FETCHER_DB_PASSWORD"), os.Getenv("POSTGRES_FETCHER_DB_NAME"),
		os.Getenv("POSTGRES_FETCHER_DB_SSLMODE"))
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	defer db.Close()
	err = db.Ping()
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	os.Exit(0)
}
