#!/bin/bash
set -e

# wait for sql database connection
until pg_isready -h "${DEEPFENCE_POSTGRES_USER_DB_HOST}" -p "${DEEPFENCE_POSTGRES_USER_DB_PORT}" -U "${DEEPFENCE_POSTGRES_USER_DB_USER}" -d "${DEEPFENCE_POSTGRES_USER_DB_NAME}";
do
  echo >&2 "Postgres is unavailable - sleeping"
  sleep 5
done

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

# update vulnerability databae
if [ "$DEEPFENCE_MODE" == "worker" ]; then
  echo "update vulnerability database"
  /usr/local/bin/grype db update
fi

if [[ "${1#-}" != "$1" ]]; then
	set -- /usr/local/bin/deepfence_worker "$@"
fi

exec "$@"
