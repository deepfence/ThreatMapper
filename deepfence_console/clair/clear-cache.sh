#!/bin/bash

table_exists=$(psql -tA "host=${POSTGRES_FETCHER_DB_HOST} port=${POSTGRES_FETCHER_DB_PORT} user=${POSTGRES_FETCHER_DB_USER} password=${POSTGRES_FETCHER_DB_PASSWORD} dbname=${POSTGRES_FETCHER_DB_NAME}" -c "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'layer')")

if [[ "$table_exists" == "t" ]]; then
  echo "Truncating layer, layer_diff_featureversion tables"
  psql "host=${POSTGRES_FETCHER_DB_HOST} port=${POSTGRES_FETCHER_DB_PORT} user=${POSTGRES_FETCHER_DB_USER} password=${POSTGRES_FETCHER_DB_PASSWORD} dbname=${POSTGRES_FETCHER_DB_NAME}" -c "TRUNCATE TABLE layer,layer_diff_featureversion"
fi
