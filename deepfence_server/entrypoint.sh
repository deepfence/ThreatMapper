#!/bin/sh
set -e

until pg_isready -h "${DEEPFENCE_POSTGRES_USER_DB_HOST}" -p "${DEEPFENCE_POSTGRES_USER_DB_PORT}" -U "${DEEPFENCE_POSTGRES_USER_DB_USER}" -d "${DEEPFENCE_POSTGRES_USER_DB_NAME}"; do
  echo >&2 "Postgres is unavailable - sleeping"
  sleep 5
done

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
