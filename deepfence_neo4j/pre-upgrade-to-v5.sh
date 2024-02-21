#!/bin/bash

set -e

NEO4J_MAJOR_VERSION=`neo4j version | cut -d" " -f2 | cut -d. -f1`

echo "neo4j version: $NEO4J_MAJOR_VERSION"

if [ "$NEO4J_MAJOR_VERSION" == "4" ]
then
    echo "prepare for database migration required for new version"

    neo4j stop

    mkdir -p /backups/migrations

    neo4j-admin dump --expand-commands --database=system --to /backups/migrations/system.dump 

    neo4j-admin dump --expand-commands --database=neo4j --to /backups/migrations/neo4j.dump

    rm -rf /data/databases/* /data/transactions/* /plugins/*

    touch /backups/migrations/.migrate
else
    echo "skip migration preparation"
fi