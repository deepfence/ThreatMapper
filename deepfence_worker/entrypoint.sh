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
databaseURL="postgres://${DEEPFENCE_POSTGRES_USER_DB_USER}:${DEEPFENCE_POSTGRES_USER_DB_PASSWORD}@${DEEPFENCE_POSTGRES_USER_DB_HOST}:${DEEPFENCE_POSTGRES_USER_DB_PORT}/${DEEPFENCE_POSTGRES_USER_DB_NAME}?sslmode=${DEEPFENCE_POSTGRES_USER_DB_SSLMODE}"
if [ "$DEEPFENCE_MODE" == "scheduler" ]; then
  echo "run database migrations"
  /usr/local/bin/migrate -verbose -source file:///usr/local/postgresql-migrate -database $databaseURL up
  if [ ! $? -eq 0 ]; then
      echo "postgres database migration failed, exiting"
      exit 1
  fi
  echo "run database migrations, complete"
else
  echo "$DEEPFENCE_MODE is not scheduler skip database migrations"
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
