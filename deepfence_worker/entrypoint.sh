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
  sleep 5;
done

# wait for file server to start
if [ "$DEEPFENCE_MINIO_HOST" != "s3.amazonaws.com" ]; then
  until nc -z ${DEEPFENCE_MINIO_HOST} ${DEEPFENCE_MINIO_PORT};
  do
    echo "file server is unavailable - sleeping"
    sleep 5;
  done
else
  echo "S3 mode skip file server health check"
fi

# for aws s3
export GRYPE_DB_UPDATE_URL="http://${DEEPFENCE_MINIO_HOST}:${DEEPFENCE_MINIO_PORT}/database/database/vulnerability/listing.json"
if [ "$DEEPFENCE_MINIO_HOST" == "s3.amazonaws.com" ]; then
  export GRYPE_DB_UPDATE_URL="https://${DEEPFENCE_MINIO_DB_BUCKET}.s3.${DEEPFENCE_MINIO_REGION}.amazonaws.com/database/vulnerability/listing.json"
fi

# update vulnerability databae
if [ "$DEEPFENCE_MODE" == "worker" ]; then
  echo "update vulnerability database"
  echo "db update url $GRYPE_DB_UPDATE_URL"
  /usr/local/bin/grype db update
  echo "0 */2 * * * export GRYPE_DB_UPDATE_URL=${GRYPE_DB_UPDATE_URL} && /usr/local/bin/grype db update" >> /etc/crontabs/root
  /usr/sbin/crond
fi

if [[ "${1#-}" != "$1" ]]; then
	set -- /usr/local/bin/deepfence_worker "$@"
fi

exec "$@"
