#!/bin/sh
set -e

until pg_isready -h "${DEEPFENCE_POSTGRES_USER_DB_HOST}" -p "${DEEPFENCE_POSTGRES_USER_DB_PORT}" -U "${DEEPFENCE_POSTGRES_USER_DB_USER}" -d "${DEEPFENCE_POSTGRES_USER_DB_NAME}"; do
  echo >&2 "Postgres is unavailable - sleeping"
  sleep 5
done

# Database migration
/usr/local/bin/migrate \
  -source file:///usr/local/postgresql-migrate \
  -database "postgres://${DEEPFENCE_POSTGRES_USER_DB_USER}:${DEEPFENCE_POSTGRES_USER_DB_PASSWORD}@${DEEPFENCE_POSTGRES_USER_DB_HOST}:${DEEPFENCE_POSTGRES_USER_DB_PORT}/${DEEPFENCE_POSTGRES_USER_DB_NAME}?sslmode=${DEEPFENCE_POSTGRES_USER_DB_SSLMODE}" \
  up

if [ ! $? -eq 0 ]; then
    echo "postgres database migration failed, exiting"
    exit 1
fi

# wait for neo4j to start
until nc -z ${DEEPFENCE_NEO4J_HOST} ${DEEPFENCE_NEO4J_BOLT_PORT};
do 
  echo "neo4j is unavailable - sleeping"
  sleep 5; 
done

until kcat -L -b ${DEEPFENCE_KAFKA_BROKERS};
do
  echo "kafka is unavailable - sleeping"
  sleep 5
done

sed -i "s/https:\/\/petstore.swagger.io\/v2\/swagger.json/\/deepfence\/openapi.json/g" /usr/local/share/swagger-ui/swagger-initializer.js

exec "$@"
