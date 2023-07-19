#!/bin/bash
set -e

# update vulnerability databae
/usr/local/bin/grype db update

until pg_isready -h "${DEEPFENCE_POSTGRES_USER_DB_HOST}" -p "${DEEPFENCE_POSTGRES_USER_DB_PORT}" -U "${DEEPFENCE_POSTGRES_USER_DB_USER}" -d "${DEEPFENCE_POSTGRES_USER_DB_NAME}";
do
  echo >&2 "Postgres is unavailable - sleeping"
  sleep 5
done

# Database migration run if worker mode is scheduler
if [ "$DEEPFENCE_MODE" == "scheduler" ]; then
  echo "run database migrations"

  dbConnectionString="host=${DEEPFENCE_POSTGRES_USER_DB_HOST} port=${DEEPFENCE_POSTGRES_USER_DB_PORT} dbname=${DEEPFENCE_POSTGRES_USER_DB_NAME} user=${DEEPFENCE_POSTGRES_USER_DB_USER} password=${DEEPFENCE_POSTGRES_USER_DB_PASSWORD} sslmode=${DEEPFENCE_POSTGRES_USER_DB_SSLMODE}"

  /usr/local/bin/goose -dir /usr/local/postgresql-migrate -allow-missing postgres "$dbConnectionString" up
  if [ ! $? -eq 0 ]; then
      echo "postgres database migration failed, exiting"
      exit 1
  fi
  echo "run database migrations, complete"
fi

# wait for neo4j to start
until nc -z ${DEEPFENCE_NEO4J_HOST} ${DEEPFENCE_NEO4J_BOLT_PORT};
do 
  echo "neo4j is unavailable - sleeping"
  sleep 5; 
done

# wait for kafka connection
until kcat -L -b ${DEEPFENCE_KAFKA_BROKERS};
do 
  echo "kafka is unavailable - sleeping"
  sleep 5
done

if [[ "${1#-}" != "$1" ]]; then
	set -- /usr/local/bin/deepfence_worker "$@"
fi

exec "$@"
