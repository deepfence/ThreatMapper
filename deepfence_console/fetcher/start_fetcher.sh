#!/bin/bash

if [ ! -v DF_PROG_NAME ]; then
  echo "Environment variable DF_PROG_NAME not set. It has to be a string"
  exit 0
fi

if [ -d "/data" ]; then
  mkdir -p /data/$DF_PROG_NAME/data
  rm -rf /tmp
  ln -s /data/$DF_PROG_NAME/data /tmp
fi

sleep 30

until psql "host=${POSTGRES_USER_DB_HOST} port=${POSTGRES_USER_DB_PORT} sslmode=${POSTGRES_USER_DB_SSLMODE} user=${POSTGRES_USER_DB_USER} password=${POSTGRES_USER_DB_PASSWORD} dbname=${POSTGRES_USER_DB_NAME}" -c '\l'; do
  echo >&2 "Postgres is unavailable - sleeping"
  sleep 5
done

/usr/local/bin/fetcher-server