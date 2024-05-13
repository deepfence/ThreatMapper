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
if [ "$DEEPFENCE_FILE_SERVER_HOST" != "s3.amazonaws.com" ]; then
  until nc -z "${DEEPFENCE_FILE_SERVER_HOST}" "${DEEPFENCE_FILE_SERVER_PORT}";
  do
    echo "file server is unavailable - sleeping"
    sleep 5;
  done
else
  echo "S3 mode skip file server health check"
fi

# for aws s3
fileServerProtocol="http"
if [ "$DEEPFENCE_FILE_SERVER_SECURE" == "true" ]; then
  fileServerProtocol="https"
fi

export GRYPE_DB_UPDATE_URL="${fileServerProtocol}://${DEEPFENCE_FILE_SERVER_HOST}:${DEEPFENCE_FILE_SERVER_PORT}/database/database/vulnerability/listing.json"
if [ "$DEEPFENCE_FILE_SERVER_HOST" == "s3.amazonaws.com" ]; then
  export GRYPE_DB_UPDATE_URL="${fileServerProtocol}://${DEEPFENCE_FILE_SERVER_DB_BUCKET}.s3.${DEEPFENCE_FILE_SERVER_REGION}.amazonaws.com/database/vulnerability/listing.json"
fi

# update vulnerability databae
if [ "$DEEPFENCE_MODE" == "worker" ]; then
  echo "add cron job to update vulnerability database"
  echo "vulnerability database update url $GRYPE_DB_UPDATE_URL"
  # /usr/local/bin/grype db update
  echo "0 */2 * * * export GRYPE_DB_UPDATE_URL=${GRYPE_DB_UPDATE_URL} && /usr/local/bin/grype db update" >> /etc/cron.d/crontab && chmod 0644 /etc/cron.d/crontab
  /usr/sbin/cron
fi

if [[ "${1#-}" != "$1" ]]; then
	set -- /usr/local/bin/deepfence_worker "$@"
fi

exec "$@"
