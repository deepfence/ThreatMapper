#!/bin/sh
set -e

until kcat -L -b ${DEEPFENCE_KAFKA_BROKERS};
do 
  sleep 5
done

exec "$@"
