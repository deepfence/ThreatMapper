#!/bin/sh
set -e

until pg_isready -h "${POSTGRES_USER_DB_HOST}" -p "${POSTGRES_USER_DB_PORT}" -U "${POSTGRES_USER_DB_USER}" -d "${POSTGRES_USER_DB_NAME}"; do
  echo >&2 "Postgres is unavailable - sleeping"
  sleep 5
done

# TODO: migrate db

exec "$@"
