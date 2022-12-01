#!/bin/bash

set +e

if [ ! -v DF_PROG_NAME ]; then
    echo "Environment variable DF_PROG_NAME not set. Set it to any string"
    exit 0
fi

if [ -d "/data" ]; then
    mkdir -p /data/$DF_PROG_NAME/data
#    rm -rf /var/log/postgresql/data
#    chown -R postgres:postgres /data/$DF_PROG_NAME
#    ln -s /data/$DF_PROG_NAME/data /var/lib/postgresql/
#    chown -R postgres:postgres /var/lib/postgresql
fi


