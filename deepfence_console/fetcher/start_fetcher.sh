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

until pg_isready -h "${POSTGRES_USER_DB_HOST}" -p "${POSTGRES_USER_DB_PORT}" -U "${POSTGRES_USER_DB_USER}" -d "${POSTGRES_USER_DB_NAME}"; do
  echo >&2 "Postgres is unavailable - sleeping"
  sleep 5
done

/usr/local/bin/fetcher-server