#!/bin/sh

{
    set -e
    PONG=`redis-cli -h localhost ping | grep PONG`
    while [ -z "$PONG" ]; do
        sleep 1
        echo "Retry Redis ping... "
        PONG=`redis-cli -h localhost ping | grep PONG`
    done
    redis-cli DEL ipportpid_map
    redis-cli DEL network_map
}&

exec redis-server /usr/local/etc/redis/redis.conf
