#!/bin/bash

if [ ! -v DF_PROG_NAME ]; then
    echo "Environment variable DF_PROG_NAME is not set. It has to be a string <redis1, redis1>.."
    exit 0
fi

if [ -d "/data" ]; then
    mkdir -p "/data/$DF_PROG_NAME/data"
fi

#echo no > /sys/kernel/mm/transparent_hugepage/enabled
#echo no > /sys/kernel/mm/transparent_hugepage/defrag

# Wait till deepfence-init-container sets required file-max
for _ in {1..5}; do
  fileMax=$(sysctl -n fs.file-max)
  if [[ $fileMax == "1048576" ]]; then
    break
  fi
  sleep 4
done

#echo "client-output-buffer-limit pubsub 512mb 256mb 60" >> /usr/local/bin/redis.conf

if [[ "$INITIALIZE_REDIS" == "Y" ]]; then
    /usr/local/bin/initializeRedis.sh &
fi

/usr/local/bin/redis-server /usr/local/bin/redis.conf --dir "/data/$DF_PROG_NAME/data"

# first arg is `-f` or `--some-option`
# or first arg is `something.conf`
#if [ "${1#-}" != "$1" ] || [ "${1%.conf}" != "$1" ]; then
#	set -- redis-server "$@"
#fi

# allow the container to be started with `--user`
#if [ "$1" = 'redis-server' -a "$(id -u)" = '0' ]; then
#	chown -R redis .
#	exec gosu redis "$0" "$@"
#fi

#exec "$@"
