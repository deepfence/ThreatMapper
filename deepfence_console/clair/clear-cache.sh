#!/bin/bash
psql "host=${POSTGRES_FETCHER_DB_HOST} port=${POSTGRES_FETCHER_DB_PORT} user=${POSTGRES_FETCHER_DB_USER} password=${POSTGRES_FETCHER_DB_PASSWORD} dbname=${POSTGRES_FETCHER_DB_NAME}" -c "TRUNCATE TABLE layer,layer_diff_featureversion"

