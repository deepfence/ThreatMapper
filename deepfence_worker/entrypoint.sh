#!/bin/bash
set -e

# update vulnerability databae
/usr/local/bin/grype db update

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
