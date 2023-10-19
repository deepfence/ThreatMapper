#!/bin/sh

# If command starts with an option, prepend weed.
if [ "${1}" != "weed" ]; then
    if [ -n "${1}" ]; then
        set -- weed "$@"
    fi
fi

envsubst < /etc/seaweed.json.sample > /etc/seaweed.json

exec "$@"
