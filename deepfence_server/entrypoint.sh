#!/bin/sh
set -e

until pg_isready -h "${POSTGRES_USER_DB_HOST}" -p "${POSTGRES_USER_DB_PORT}" -U "${POSTGRES_USER_DB_USER}" -d "${POSTGRES_USER_DB_NAME}"; do
  echo >&2 "Postgres is unavailable - sleeping"
  sleep 5
done

# Database migration
/usr/local/bin/migrate \
  -source file:///usr/local/postgresql-migrate \
  -database "postgres://${POSTGRES_USER_DB_USER}:${POSTGRES_USER_DB_PASSWORD}@${POSTGRES_USER_DB_HOST}:${POSTGRES_USER_DB_PORT}/${POSTGRES_USER_DB_NAME}?sslmode=${POSTGRES_USER_DB_SSLMODE}" \
  up

if [ ! $? -eq 0 ]; then
    echo "postgres database migration failed, exiting"
    exit 1
fi

sed -i "s/https:\/\/petstore.swagger.io\/v2\/swagger.json/\/deepfence\/openapi-docs/g" /usr/local/share/swagger-ui/swagger-initializer.js

exec "$@"
