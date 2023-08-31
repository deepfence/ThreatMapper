#!/bin/sh

# If command starts with an option, prepend weed.
if [ "${1}" != "weed" ]; then
    if [ -n "${1}" ]; then
        set -- weed "$@"
    fi
fi

# Create the bucket
mkdir -p "/data/$BUCKET_NAME"

exec "$@"
