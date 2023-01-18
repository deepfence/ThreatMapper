#!/bin/bash
set -e

# update vulnerability databae
/usr/local/bin/grype db update

# wait for kafka connection
until kcat -L -b ${DEEPFENCE_KAFKA_BROKERS};
do 
  sleep 5
done

if [[ "${1#-}" != "$1" ]]; then
	set -- /usr/local/bin/deepfence_worker "$@"
fi

exec "$@"
