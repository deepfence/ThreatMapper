#!/bin/sh
set -e

until kcat -L -b ${KAFKA_BROKERS};
do 
  sleep 5
done

exec "$@"
